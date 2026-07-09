import hashlib
import hmac
import json
import os
from typing import Any, Dict

import aiohttp
from aiohttp import ClientTimeout
from pydantic import BaseModel, Field, PrivateAttr

from workflow.engine.entities.private_config import PrivateConfig
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


class _StreamResponse(BaseModel):
    """SSE 流式返回的数据"""

    code: int
    message: str
    sid: str = ""
    data: Dict[str, Any] | None = Field(default_factory=dict)


class RPANode(BaseNode):
    _private_config: PrivateConfig = PrivateAttr(
        default_factory=lambda: PrivateConfig(timeout=24 * 60 * 60)
    )
    projectId: str
    header: Dict[str, Any]
    source: str = ""
    version: int | None = None
    rpaParams: Dict[str, Any] = Field(default_factory=dict)
    triggerSource: str = ""
    triggerAuthRequired: bool = False
    triggerSecretEnv: str = "OPENCLAW_RPA_TRIGGER_SECRET"
    triggerSignatureInput: str = "trigger_signature"
    scenario: str = ""
    allowedScenarios: list[str] = Field(default_factory=list)
    approvalRequired: bool = False
    approvalStatus: str = ""
    approver: str = ""
    riskLevel: str = "high"
    auditTags: list[str] = Field(default_factory=list)

    def openclaw_control_enabled(self) -> bool:
        return (
            (self.triggerSource or "").lower() == "openclaw"
            or self.triggerAuthRequired
            or self.approvalRequired
            or bool(self.allowedScenarios)
        )

    def _sanitize_control_inputs(self, inputs: dict[str, Any]) -> dict[str, Any]:
        return {
            key: value
            for key, value in inputs.items()
            if key != self.triggerSignatureInput
        }

    def build_openclaw_signature_payload(self, inputs: dict[str, Any]) -> str:
        payload = {
            "project_id": self.projectId,
            "trigger_source": self.triggerSource,
            "scenario": self.scenario,
            "inputs": self._sanitize_control_inputs(inputs),
        }
        return json.dumps(
            payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        )

    def build_openclaw_signature(self, inputs: dict[str, Any], secret: str) -> str:
        payload = self.build_openclaw_signature_payload(inputs)
        return hmac.new(
            secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()

    def build_openclaw_audit_event(
        self, inputs: dict[str, Any], decision: str
    ) -> dict[str, Any]:
        return {
            "event": "openclaw_rpa_trigger",
            "decision": decision,
            "trigger_source": self.triggerSource or "workflow",
            "project_id": self.projectId,
            "scenario": self.scenario,
            "risk_level": self.riskLevel,
            "approval_required": self.approvalRequired,
            "approval_status": self.approvalStatus,
            "approver": self.approver,
            "input_keys": sorted(self._sanitize_control_inputs(inputs).keys()),
            "audit_tags": self.auditTags,
        }

    def build_control_outputs(
        self, status: str, message: str, audit: dict[str, Any]
    ) -> dict[str, Any]:
        output_candidates = {
            "status": status,
            "message": message,
            "audit": audit,
        }
        return {
            output: output_candidates[output]
            for output in self.output_identifier
            if output in output_candidates
        }

    async def _record_openclaw_audit_event(
        self,
        span: Span,
        audit: dict[str, Any],
        event_log_node_trace: NodeLog | None = None,
    ) -> None:
        await span.add_info_events_async({"openclaw_rpa_audit": audit})
        if event_log_node_trace:
            event_log_node_trace.append_config_data({"openclaw_rpa_audit": audit})

    async def evaluate_openclaw_controls(
        self,
        inputs: dict[str, Any],
        span: Span,
        event_log_node_trace: NodeLog | None = None,
    ) -> NodeRunResult | dict[str, Any] | None:
        if not self.openclaw_control_enabled():
            return None

        if not self.scenario:
            raise CustomException(
                err_code=CodeEnum.RPA_NODE_ERROR,
                err_msg="OpenClaw RPA scenario cannot be empty",
            )

        if self.allowedScenarios and self.scenario not in self.allowedScenarios:
            audit = self.build_openclaw_audit_event(inputs, "scenario_denied")
            await self._record_openclaw_audit_event(span, audit, event_log_node_trace)
            raise CustomException(
                err_code=CodeEnum.RPA_NODE_ERROR,
                err_msg=f"OpenClaw RPA scenario {self.scenario} is not allowed",
            )

        if self.triggerAuthRequired:
            if self.triggerSignatureInput not in inputs:
                audit = self.build_openclaw_audit_event(
                    inputs, "missing_trigger_signature_input"
                )
                await self._record_openclaw_audit_event(
                    span, audit, event_log_node_trace
                )
                raise CustomException(
                    err_code=CodeEnum.RPA_NODE_ERROR,
                    err_msg=(
                        "OpenClaw RPA trigger signature input "
                        f"{self.triggerSignatureInput} is missing"
                    ),
                )
            if not self.triggerSecretEnv:
                audit = self.build_openclaw_audit_event(
                    inputs, "missing_trigger_secret_env"
                )
                await self._record_openclaw_audit_event(
                    span, audit, event_log_node_trace
                )
                raise CustomException(
                    err_code=CodeEnum.RPA_NODE_ERROR,
                    err_msg="OpenClaw RPA trigger secret env cannot be empty",
                )
            secret = os.getenv(self.triggerSecretEnv, "")
            provided_signature = str(inputs.get(self.triggerSignatureInput, ""))
            if not secret:
                audit = self.build_openclaw_audit_event(
                    inputs, "missing_trigger_secret"
                )
                await self._record_openclaw_audit_event(
                    span, audit, event_log_node_trace
                )
                raise CustomException(
                    err_code=CodeEnum.RPA_NODE_ERROR,
                    err_msg=f"{self.triggerSecretEnv} is not configured",
                )
            expected_signature = self.build_openclaw_signature(inputs, secret)
            if not hmac.compare_digest(provided_signature, expected_signature):
                audit = self.build_openclaw_audit_event(inputs, "signature_rejected")
                await self._record_openclaw_audit_event(
                    span, audit, event_log_node_trace
                )
                raise CustomException(
                    err_code=CodeEnum.RPA_NODE_ERROR,
                    err_msg="OpenClaw RPA trigger signature is invalid",
                )

        if self.approvalRequired and (self.approvalStatus or "").lower() != "approved":
            audit = self.build_openclaw_audit_event(inputs, "approval_required")
            await self._record_openclaw_audit_event(span, audit, event_log_node_trace)
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=self._sanitize_control_inputs(inputs),
                outputs=self.build_control_outputs(
                    "approval_required",
                    "OpenClaw RPA trigger is waiting for human approval",
                    audit,
                ),
                process_data={"openclaw_rpa_audit": audit},
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )

        audit = self.build_openclaw_audit_event(inputs, "approved")
        await self._record_openclaw_audit_event(span, audit, event_log_node_trace)
        return audit

    async def execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
    ) -> NodeRunResult:
        try:
            inputs, outputs = {}, {}
            for identifier in self.input_identifier:
                inputs[identifier] = variable_pool.get_variable(
                    node_id=self.node_id, key_name=identifier, span=span
                )
            logged_inputs = (
                self._sanitize_control_inputs(inputs)
                if self.openclaw_control_enabled()
                else inputs
            )
            await span.add_info_events_async({"rpa_input": f"{logged_inputs}"})
            openclaw_audit = await self.evaluate_openclaw_controls(
                inputs, span, event_log_node_trace
            )
            if isinstance(openclaw_audit, NodeRunResult):
                return openclaw_audit
            rpa_inputs = (
                self._sanitize_control_inputs(inputs)
                if self.openclaw_control_enabled()
                else inputs
            )
            status = WorkflowNodeExecutionStatus.SUCCEEDED
            url = f"{os.getenv('RPA_BASE_URL')}/rpa/v1/exec"
            variable_ext: dict = variable_pool.system_params.get(
                ParamKey.Ext, default={}
            )
            phone_number = variable_ext.get("phone_number", "")
            req_body = {
                "project_id": self.projectId,
                "sid": span.sid,
                "exec_position": self.rpaParams.get("execPosition", "EXECUTOR"),
                "params": rpa_inputs,
                **({"version": self.version} if self.version else {}),
                **({"phone_number": phone_number} if phone_number else {}),
            }
            await span.add_info_event_async(f"req_body: {req_body}")

            headers = {
                "Content-Type": "application/json",
                "Authorization": self.header.get("apiKey", ""),
            }

            data: Dict[str, Any] = {}
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "url": url,
                        "req_body": json.dumps(req_body, ensure_ascii=False),
                    }
                )

            async with aiohttp.ClientSession(
                timeout=ClientTimeout(total=24 * 60 * 60, sock_connect=30)
            ) as session:
                async with session.post(
                    url=url, headers=headers, json=req_body
                ) as response:
                    async for line in response.content:
                        msg = line.decode("utf-8")
                        if not msg.startswith("data:"):
                            continue
                        await span.add_info_event_async(f"recv: {msg}")
                        frame = _StreamResponse.model_validate_json(
                            msg.removeprefix("data:")
                        )
                        if frame.code != 0:
                            raise CustomException(
                                err_code=CodeEnum.RPA_REQUEST_ERROR,
                                err_msg=frame.message,
                            )
                        data = frame.data if frame.data is not None else {}
            outputs.update(
                {
                    output: data.get(output)
                    for output in self.output_identifier
                    if output in data
                }
            )
            if isinstance(openclaw_audit, dict):
                outputs.update(
                    self.build_control_outputs(
                        "executed",
                        "OpenClaw RPA trigger was approved and executed",
                        {
                            **openclaw_audit,
                            "decision": "executed",
                        },
                    )
                )

            return NodeRunResult(
                status=status,
                inputs=rpa_inputs,
                outputs=outputs,
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )
        except CustomException as e:
            span.record_exception(e)
            return NodeRunResult(
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=e,
            )
        except Exception as e:
            status = WorkflowNodeExecutionStatus.FAILED
            span.record_exception(e)
            return NodeRunResult(
                status=status,
                inputs=inputs,
                outputs=outputs,
                error=CustomException(
                    CodeEnum.RPA_NODE_ERROR,
                    cause_error=e,
                ),
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        description: 异步执行
        """
        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "projectId": self.projectId,
                        "header": self.header,
                        "source": self.source,
                        "rpaParams": self.rpaParams,
                    }
                )
            return await self.execute(
                variable_pool,
                span_context,
                event_log_node_trace,
            )
