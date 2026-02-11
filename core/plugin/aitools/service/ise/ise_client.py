"""
ISE speech evaluation client module providing intelligent speech assessment services.
"""

# # pylint: disable=broad-exception-caught,line-too-long,too-few-public-methods,too-many-arguments,too-many-locals,import-outside-toplevel
import _thread as thread
import base64
import hashlib
import hmac
import io
import json
import os
import ssl
import xml.etree.ElementTree as ET
from datetime import datetime
from time import mktime
from typing import Any, Callable, Dict, Optional, Tuple
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time

import websocket
from pydub import AudioSegment  # type: ignore[import-untyped]


class AudioConverter:
    """Audio converter for ISE speech evaluation"""

    @staticmethod
    def detect_audio_format(audio_data: bytes) -> str:
        """Check the audio format of the given audio data."""
        # Check the magic number of the audio data.
        if audio_data.startswith(b"RIFF") and b"WAVE" in audio_data[:12]:
            return "wav"
        if (
            audio_data.startswith(b"ID3")
            or audio_data.startswith(b"\xff\xfb")
            or audio_data.startswith(b"\xff\xf3")
        ):
            return "mp3"
        if audio_data.startswith(b"OggS"):
            return "ogg"
        if audio_data.startswith(b"fLaC"):
            return "flac"
        if audio_data.startswith(b"#!AMR"):
            return "amr"
        return "unknown"

    @staticmethod
    def get_audio_properties(audio_data: bytes) -> Dict[str, Any]:
        """Get the properties of the given audio data."""

        try:
            format_type = AudioConverter.detect_audio_format(audio_data)

            # Load the audio file.
            if format_type == "mp3":
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
            elif format_type == "wav":
                audio = AudioSegment.from_wav(io.BytesIO(audio_data))
            elif format_type == "ogg":
                audio = AudioSegment.from_ogg(io.BytesIO(audio_data))
            elif format_type == "flac":
                audio = AudioSegment.from_file(io.BytesIO(audio_data), format="flac")
            else:
                # Try to auto-detect the format.
                audio = AudioSegment.from_file(io.BytesIO(audio_data))

            return {
                "sample_rate": audio.frame_rate,
                "channels": audio.channels,
                "sample_width": audio.sample_width,
                "duration": len(audio) / 1000.0,  # Convert to seconds.
                "format": format_type,
                "bit_depth": audio.sample_width * 8,
            }

        except Exception as e:
            return {
                "sample_rate": None,
                "channels": None,
                "sample_width": None,
                "duration": None,
                "format": AudioConverter.detect_audio_format(audio_data),
                "error": f"音频属性检测失败: {str(e)}",
            }

    @staticmethod
    def convert_to_wav(
        audio_data: bytes, source_format: str | None = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Convert the given audio data to WAV format."""

        # Get the original audio properties.
        original_properties = AudioConverter.get_audio_properties(audio_data)

        try:
            # Check the source format.
            if source_format is None:
                source_format = AudioConverter.detect_audio_format(audio_data)

            # If the audio is already in WAV format, check if it meets the requirements.
            if source_format == "wav":
                # Check the WAV format parameters.
                audio = AudioSegment.from_wav(io.BytesIO(audio_data))
                if (
                    audio.frame_rate == 16000
                    and audio.sample_width == 2
                    and audio.channels == 1
                ):
                    return audio_data, original_properties

            # Load the audio file.
            if source_format == "mp3":
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
            elif source_format == "wav":
                audio = AudioSegment.from_wav(io.BytesIO(audio_data))
            elif source_format == "ogg":
                audio = AudioSegment.from_ogg(io.BytesIO(audio_data))
            elif source_format == "flac":
                audio = AudioSegment.from_file(io.BytesIO(audio_data), format="flac")
            else:
                # Try to auto-detect the format.
                audio = AudioSegment.from_file(io.BytesIO(audio_data))

            # Convert the audio to the target format: 16kHz, 16bit, 1 channel.
            audio = audio.set_frame_rate(16000)  # Set the sample rate to 16kHz.
            audio = audio.set_sample_width(2)  # Set the sample width to 16bit.
            audio = audio.set_channels(1)  # Set the number of channels to 1.

            # Export the audio as WAV format.
            wav_io = io.BytesIO()
            audio.export(wav_io, format="wav")
            wav_data = wav_io.getvalue()
            wav_io.close()

            return wav_data, original_properties

        except Exception as e:
            raise ValueError(f"音频转换失败: {e}") from e

    @staticmethod
    def validate_audio_format(audio_data: bytes) -> Tuple[bool, str]:
        """Validate the audio format."""
        try:
            format_type = AudioConverter.detect_audio_format(audio_data)
            if format_type == "wav":
                audio = AudioSegment.from_wav(io.BytesIO(audio_data))
                if (
                    audio.frame_rate == 16000
                    and audio.sample_width == 2
                    and audio.channels == 1
                ):
                    return True, "音频格式符合要求"
                return (
                    False,
                    f"WAV格式不符合要求: {audio.frame_rate}Hz,\
                            {audio.sample_width*8}bit, {audio.channels}声道",
                )
            return False, f"音频格式为{format_type}，需要转换为WAV"

        except Exception as e:
            return False, f"音频验证失败: {str(e)}"


class ISEResultParser:
    """ISE speech evaluation result parser"""

    @staticmethod
    def parse_xml_result(xml_string: str, _group: str = "adult") -> Dict[str, Any]:
        """
        Parse the XML result of ISE speech evaluation.

        Args:
            xml_string: The XML string of the ISE speech evaluation result.
            _group: The group of the ISE speech evaluation.

        Returns:
            Dict: The structured JSON format of the ISE speech evaluation result.
        """
        try:
            root = ET.fromstring(xml_string)
            result = {
                "evaluation_id": root.get("id", ""),
                "overall_score": 0.0,
                "detailed_scores": {},
                "status": "success",
                "warnings": [],
                "raw_xml": xml_string,
            }

            # Find the evaluation node
            task_node = ISEResultParser._find_evaluation_node(root, xml_string)
            if isinstance(task_node, dict):  # Error case
                return task_node

            # Process exception status
            ISEResultParser._process_exception_info(task_node, result)
            ISEResultParser._process_rejection_status(task_node, result)

            # Extract the task scores
            task_scores = ISEResultParser._extract_score_fields(task_node)
            result["detailed_scores"] = task_scores
            result["overall_score"] = task_scores.get("total_score", 0)

            return result

        except Exception as e:
            return {
                "error": f"XML解析失败: {str(e)}",
                "raw_xml": xml_string,
                "overall_score": 0,
                "status": "parse_error",
            }

    @staticmethod
    def _find_evaluation_node(root: Any, xml_string: str) -> Any:
        """Find the evaluation node that contains the score data."""
        rec_paper = root.find(".//rec_paper")
        if rec_paper is None:
            return {
                "error": "未找到rec_paper节点",
                "raw_xml": xml_string,
                "overall_score": 0,
                "status": "parse_error",
            }

        for child in rec_paper:
            if child.get("total_score"):
                return child

        return {
            "error": "未找到包含评分的评测节点",
            "raw_xml": xml_string,
            "overall_score": 0,
            "status": "parse_error",
        }

    @staticmethod
    def _process_exception_info(task_node: Any, result: Dict[str, Any]) -> None:
        """Process the exception information of the task node."""
        except_info = task_node.get("except_info", "0")
        if except_info == "0":
            return

        except_code = int(except_info)
        exception_mappings = {
            28673: ("audio_error", "引擎判断该语音为无语音或音量小类型"),
            28676: ("content_mismatch", "引擎判断该语音为乱说类型"),
            28680: ("noise_error", "引擎判断该语音为信噪比低类型"),
            28690: ("clipping_error", "引擎判断该语音为截幅类型"),
            28689: ("no_audio", "引擎判断没有音频输入"),
        }

        if except_code in exception_mappings:
            status, message = exception_mappings[except_code]
            result["status"] = status
            result["warnings"].append(message)
        else:
            result["status"] = "unknown_error"
            result["warnings"].append(f"引擎返回未知异常代码: {except_code}")

    @staticmethod
    def _process_rejection_status(task_node: Any, result: Dict[str, Any]) -> None:
        """Process the rejection status of the task node."""
        is_rejected = task_node.get("is_rejected", "false")
        if is_rejected == "true":
            result["status"] = "rejected"
            result["warnings"].append("评测结果被拒：引擎检测到乱读，分值不能作为参考")

    @staticmethod
    def _extract_score_fields(task_node: Any) -> Dict[str, Any]:
        """Extract the score fields from the task node."""
        task_scores = {}
        score_fields = [
            "total_score",
            "accuracy_score",
            "emotion_score",
            "fluency_score",
            "integrity_score",
            "phone_score",
            "tone_score",
        ]

        for field in score_fields:
            score_value = task_node.get(field)
            if score_value is not None and score_value != "":
                try:
                    task_scores[field] = float(score_value)
                except (ValueError, TypeError):
                    pass

        return task_scores

    @staticmethod
    def check_low_score_warning(
        result: Dict[str, Any], original_audio_properties: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check the low score warning mechanism,
        and add audio quality related warnings
        """
        score = result.get("overall_score", 0)
        original_sample_rate = original_audio_properties.get("sample_rate")

        # If the score is less than 5
        # and the original sample rate is not 16kHz,
        # add a warning message.
        if score < 5 and original_sample_rate and original_sample_rate != 16000:
            warning_msg = (
                f"低分预警：检测到您的音频原始采样率为 {original_sample_rate}Hz，"
                f"ISE评测服务要求16kHz采样率以获得最佳效果。当前得分 {score:.1f} 可能受到音频质量影响。"
                f"建议使用16kHz采样率的高质量音频重新评测。"
            )

            # Insert the audio quality warning message to the warning list.
            if "warnings" not in result:
                result["warnings"] = []
            result["warnings"].insert(0, warning_msg)

        return result


class ISEParam:
    """ISE WebSocket Param Class"""

    def __init__(
        self,
        app_id: str,
        api_key: str,
        api_secret: str,
        audio_data: bytes,
        text: str = "",
        language: str = "cn",
        category: str = "read_sentence",
        group: str = "adult",
    ):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.audio_data = audio_data
        self.text = text

        # Validate the age group parameter.
        valid_groups = ["pupil", "youth", "adult"]
        if group not in valid_groups:
            raise ValueError(f"无效的年龄组参数: {group}，有效选项: {valid_groups}")

        # Set up the engine type parameter.
        ent = "cn_vip" if language == "cn" else "en_vip"

        # Set up the public parameters.
        self.common_args = {"app_id": self.app_id}

        # Business parameters - according to the official document format
        self.business_args = {
            "category": category,  # Evaluation category
            "sub": "ise",  # Service type
            "ent": ent,  # Engine type
            "cmd": "ssb",  # Command
            "auf": "audio/L16;rate=16000",  # Audio format
            "aue": "raw",  # Audio encoding
            "text": self._encode_text() if text else "",  # Evaluation text
            "tte": "utf-8",  # Text encoding
            "rstcd": "utf8",  # Result encoding
            "group": group,  # Age group: pupil/youth/adult
        }

    def _encode_text(self) -> str:
        """Encode the evaluation text according to the official document format."""
        if not self.text:
            return ""
        # Add BOM and content marker according to the official document format
        formatted_text = f"\ufeff[content]\n{self.text}"
        return formatted_text


class ISEClient:
    """Xunfei ISE Speech Evaluation Client"""

    def __init__(self, app_id: str, api_key: str, api_secret: str) -> None:
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = os.getenv("ISE_URL")
        self.evaluation_complete = False
        self.error_msg: Optional[str] = None
        self.result: Optional[Dict[str, Any]] = None

    async def evaluate_audio(
        self,
        audio_data: bytes,
        text: str = "",
        language: str = "cn",
        category: str = "read_sentence",
        auto_convert: bool = True,
        group: str = "adult",
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Audio evaluation

        Args:
            audio_data: Audio data(Support MP3, WAV, OGG, FLAC...)
            text: Evaluation text(Optional, some evaluation modes require)
            language: Language type, cn(Chinese)/en(English)
            category: Evaluation type, read_syllable/read_word/read_sentence...
            auto_convert: Whether to automatically convert the audio format to WAV
            group: Age group type, pupil(Primary School)/youth(Middle School)/adult(High School), default adult

        Returns:
            Tuple[bool, str, Dict]: (Whether the evaluation is successful, Message, Result)
        """
        try:
            # Audio format processing
            processed_audio_data = audio_data
            original_audio_properties: Dict[str, Any] = {}

            if auto_convert:
                # Check and validate the audio format
                is_valid, validation_msg = AudioConverter.validate_audio_format(
                    audio_data
                )

                if not is_valid:
                    try:
                        # Auto-convert the audio format to WAV and get the original audio properties.
                        processed_audio_data, original_audio_properties = (
                            AudioConverter.convert_to_wav(audio_data)
                        )
                        print(
                            f"音频格式已转换: {validation_msg} -> WAV 16kHz 16bit 单声道"
                        )
                        sample_rate = original_audio_properties.get(
                            "sample_rate", "unknown"
                        )
                        bit_depth = original_audio_properties.get(
                            "bit_depth", "unknown"
                        )
                        channels = original_audio_properties.get("channels", "unknown")
                        print(
                            f"原始音频属性: {sample_rate}Hz, {bit_depth}bit, {channels}声道"
                        )
                    except Exception as e:
                        return False, f"音频转换失败: {str(e)}", {}
                else:
                    print(f"音频格式验证: {validation_msg}")
                    # Even if the format is valid, get the audio properties for later analysis
                    original_audio_properties = AudioConverter.get_audio_properties(
                        audio_data
                    )
            else:
                # Without auto-conversion, we still need to get the audio properties for later analysis
                original_audio_properties = AudioConverter.get_audio_properties(
                    audio_data
                )

            ise_param = ISEParam(
                self.app_id,
                self.api_key,
                self.api_secret,
                processed_audio_data,
                text,
                language,
                category,
                group,
            )

            # Create WebSocket connection
            auth_url = self._create_auth_url()

            # Use synchronous WebSocket
            import asyncio

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._sync_evaluate, ise_param, auth_url)

            if self.error_msg:
                return False, self.error_msg, {}

            if self.result:
                # Low score warning mechanism
                self.result = ISEResultParser.check_low_score_warning(
                    self.result, original_audio_properties
                )
                return True, "评测成功", self.result
            return False, "评测失败，未获取到结果", {}

        except Exception as e:
            return False, f"评测过程中发生错误: {str(e)}", {}

    def _sync_evaluate(self, ise_param: ISEParam, auth_url: str) -> None:
        """Synchronous evaluation method - using the official frame-by-frame transport mode"""
        self.result = None
        self.error_msg = None
        self.evaluation_complete = False

        # Create WebSocket connection
        websocket.enableTrace(False)
        ws = websocket.WebSocketApp(
            auth_url,
            on_message=self._create_message_handler(ise_param),
            on_error=self._create_error_handler(),
            on_close=self._create_close_handler(),
            on_open=self._create_open_handler(ise_param),
        )

        ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})

    def _create_message_handler(self, ise_param: ISEParam) -> Callable:
        """Create WebSocket message handler"""

        def on_message(ws: Any, message: str) -> None:
            try:
                print(f"Received message: {message}")
                data = json.loads(message)

                # Check error code
                if "code" in data and data["code"] != 0:
                    self.error_msg = data.get(
                        "message", f"评测失败，错误码: {data['code']}"
                    )
                    ws.close()
                    return

                # Handle evaluation response
                if "data" in data:
                    self._handle_evaluation_response(data["data"], ise_param, ws)

            except Exception as e:
                self.error_msg = f"解析响应消息失败: {str(e)}"
                ws.close()

        return on_message

    def _handle_evaluation_response(
        self, data_info: Dict[str, Any], ise_param: ISEParam, ws: Any
    ) -> None:
        """Handle evaluation response data"""
        status = data_info.get("status", 0)

        if status == 2:  # Evaluation complete
            if "data" in data_info and data_info["data"]:
                # Base64 decode the result data and parse it as XML
                result_data = base64.b64decode(data_info["data"])
                result_str = result_data.decode("utf-8")

                self.result = ISEResultParser.parse_xml_result(
                    result_str,
                    ise_param.business_args.get("group", "adult"),
                )
            else:
                self.result = {
                    "error": "未接收到评测结果数据",
                    "overall_score": 0,
                    "status": "no_data",
                }
            self.evaluation_complete = True
            ws.close()

    def _create_error_handler(self) -> Callable:
        """Create WebSocket error handler"""

        def on_error(_ws: Any, error: Exception) -> None:
            self.error_msg = f"WebSocket连接错误: {str(error)}"

        return on_error

    def _create_close_handler(self) -> Callable:
        """Create WebSocket close handler"""

        def on_close(_ws: Any, _close_status_code: Any, _close_msg: Any) -> None:
            pass

        return on_close

    def _create_open_handler(self, ise_param: ISEParam) -> Callable:
        """Create WebSocket connection open handler"""

        def on_open(ws: Any) -> None:
            def run() -> None:
                try:
                    self._send_initial_frame(ws, ise_param)
                    self._send_audio_frames(ws, ise_param)
                except Exception as e:
                    self.error_msg = f"发送数据失败: {str(e)}"
                    ws.close()

            thread.start_new_thread(run, ())

        return on_open

    def _send_initial_frame(self, ws: Any, ise_param: ISEParam) -> None:
        """Send the initial frame data"""
        first_frame = {
            "common": ise_param.common_args,
            "business": ise_param.business_args,
            "data": {"status": 0, "data": ""},  # First frame status 0
        }
        ws.send(json.dumps(first_frame))
        print("发送首帧完成")

    def _send_audio_frames(self, ws: Any, ise_param: ISEParam) -> None:
        """Send the audio frames data"""
        audio_data = ise_param.audio_data
        frame_size = 1280  # frame size, same as the official document

        for i in range(0, len(audio_data), frame_size):
            chunk = audio_data[i : i + frame_size]
            is_last_frame = i + frame_size >= len(audio_data)

            if is_last_frame:
                self._send_final_frame(ws, chunk)
                break
            self._send_middle_frame(ws, chunk)

    def _send_final_frame(self, ws: Any, chunk: bytes) -> None:
        """Sending the final frame data"""
        frame_data = {
            "business": {"cmd": "auw", "aus": 4},
            "data": {
                "status": 2,  # Completed
                "data": base64.b64encode(chunk).decode(),
            },
        }
        ws.send(json.dumps(frame_data))
        print("发送最后一帧")

    def _send_middle_frame(self, ws: Any, chunk: bytes) -> None:
        """Sending the middle frame data"""
        frame_data = {
            "business": {"cmd": "auw", "aus": 1},
            "data": {
                "status": 1,  # Continue
                "data": base64.b64encode(chunk).decode(),
                "data_type": 1,
                "encoding": "raw",
            },
        }
        ws.send(json.dumps(frame_data))

    def _create_auth_url(self) -> str:
        """Create the WebSocket authentication URL"""
        # Generate date string
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        # Generate signature string
        signature_origin = "host: ise-api.xfyun.cn\n"
        signature_origin += f"date: {date}\n"
        signature_origin += "GET /v2/open-ise HTTP/1.1"

        # Generate signature
        signature_sha = hmac.new(
            self.api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()
        signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding="utf-8")

        # Generate authorization string
        authorization_origin = (
            f'api_key="{self.api_key}", algorithm="hmac-sha256", '
            f'headers="host date request-line", signature="{signature_sha_base64}"'
        )
        authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode(
            encoding="utf-8"
        )

        # Generate authentication URL
        auth_params = urlencode(
            {"authorization": authorization, "date": date, "host": "ise-api.xfyun.cn"}
        )

        return f"{self.base_url}?{auth_params}"

    def evaluate_pronunciation(
        self,
        audio_data: bytes,
        text: str,
        language: str = "cn",
        auto_convert: bool = True,
        group: str = "adult",
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Pronunciation evaluation(Synchronous type)

        Args:
            audio_data: Audio data(Support multiple formats)
            text: Evaluation text
            language: Language type
            auto_convert: Whether to automatically convert the audio format to WAV
            group: Age group type, pupil(Primary School)/youth(Middle School)/adult(High School), default adult

        Returns:
            Tuple[bool, str, Dict]: (Whether the evaluation is successful, Message, Result)
        """
        import asyncio

        return asyncio.run(
            self.evaluate_audio(
                audio_data, text, language, "read_chapter", auto_convert, group
            )
        )
