"""Built-in default tool seed data for link migrations and startup repair."""

DEFAULT_TOOL_INSERT_STATEMENTS = [
    """INSERT INTO tools_schema (app_id, tool_id, name, description, open_api_schema, create_at, update_at)
VALUES (
  'appid',
  'tool@8b2262bef821000',
  '超拟人合成',
  '用户上传一段话，选择特色发音人，生成一段更拟人的语音',
  '{"info": {"title": "agentBuilder toolset", "version": "1.0.0", "x-is-official": false}, "openapi": "3.1.0", "paths": {"/aitools/v1/smarttts": {"post": {"description": "用户上传一段话，选择特色发音人，生成一段更拟人的语音", "operationId": "超拟人合成-46EXFdLW", "requestBody": {"content": {"application/json": {"schema": {"properties": {"vcn": {"default": "x5_lingfeiyi_flow", "description": "特色发音人，目前可选（x5_lingfeiyi_flow）", "type": "string", "x-display": true, "x-from": 2}, "text": {"description": "需要合成的文本", "type": "string", "x-display": true, "x-from": 2}, "speed": {"default": 50, "description": "语速：0对应默认语速的1/2，100对应默认语速的2倍; 默认值50", "type": "integer", "x-display": true, "x-from": 2}}, "required": ["vcn", "text", "speed"], "type": "object"}}}, "required": true}, "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"code": {"description": "状态码", "type": "integer", "x-display": true}, "data": {"description": "结果", "properties": {"voice_url": {"description": "音频下载url", "type": "string", "x-display": true}}, "type": "object", "x-display": true}, "message": {"description": "操作消息", "type": "string", "x-display": true}, "sid": {"description": "会话id", "type": "string", "x-display": true}}, "type": "object"}}}, "description": "success"}}, "summary": "超拟人合成"}}}, "servers": [{"description": "a server description", "url": "http://core-aitools:18668"}]}',
  '2025-10-24 10:00:00',
  '2025-10-24 10:00:00'
);""",
    """INSERT INTO tools_schema (app_id, tool_id, name, description, open_api_schema, create_at, update_at)
VALUES (
  'appid',
  'tool@8b226f7d7421000',
  '文生图',
  '根据输入的内容生成与内容有关的图片',
  '{"info": {"title": "agentBuilder toolset", "version": "1.0.0", "x-is-official": false}, "openapi": "3.1.0", "paths": {"/aitools/v1/image_generate": {"post": {"description": "根据输入的内容生成与内容有关的图片", "operationId": "文生图-hrOgFpJ8", "requestBody": {"content": {"application/json": {"schema": {"properties": {"width": {"default": 1024, "description": "宽度分辨率，支持以下分辨率：512x512, 640x360, 640x480, 640x640, 680x512, 512x680, 768x768, 720x1280, 1280x720, 1024x1024", "type": "integer", "x-display": true, "x-from": 2}, "prompt": {"description": "图片描述信息", "type": "string", "x-display": true, "x-from": 2}, "height": {"default": 1024, "description": "高度分辨率，支持以下分辨率：512x512, 640x360, 640x480, 640x640, 680x512, 512x680, 768x768, 720x1280, 1280x720, 1024x1024", "type": "integer", "x-display": true, "x-from": 2}}, "required": ["width", "height", "prompt"], "type": "object"}}}, "required": true}, "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"code": {"description": "状态码", "type": "integer", "x-display": true}, "data": {"description": "结果", "properties": {"image_url": {"description": "图片下载地址", "type": "string", "x-display": true}, "image_url_md": {"description": "图片下载地址markdown格式", "type": "string", "x-display": true}}, "type": "object", "x-display": true}, "message": {"description": "操作消息", "type": "string", "x-display": true}, "sid": {"description": "会话id", "type": "string", "x-display": true}}, "type": "object"}}}, "description": "success"}}, "summary": "文生图"}}}, "servers": [{"description": "a server description", "url": "http://core-aitools:18668"}]}',
  '2025-10-24 10:00:00',
  '2025-10-24 10:00:00'
);""",
    """INSERT INTO tools_schema (app_id, tool_id, name, description, open_api_schema, create_at, update_at)
VALUES (
  'appid',
  'tool@8b2277329821000',
  '图片理解',
  '用户输入一张图片和问题，从而识别出图片中的对象、场景等信息回答用户的问题',
  '{"info": {"title": "agentBuilder toolset", "version": "1.0.0", "x-is-official": false}, "openapi": "3.1.0", "paths": {"/aitools/v1/image_understanding": {"post": {"description": "用户输入一张图片和问题，从而识别出图片中的对象、场景等信息回答用户的问题", "operationId": "图片理解-Qo66kqwh", "requestBody": {"content": {"application/json": {"schema": {"properties": {"question": {"description": "问题", "type": "string", "x-display": true, "x-from": 2}, "image_url": {"description": "图片", "type": "string", "x-display": true, "x-from": 2}}, "required": ["question", "image_url"], "type": "object"}}}, "required": true}, "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"code": {"description": "状态码", "type": "integer", "x-display": true}, "data": {"description": "结果", "properties": {"content": {"description": "回答内容", "type": "string", "x-display": true}}, "type": "object", "x-display": true}, "message": {"description": "操作消息", "type": "string", "x-display": true}, "sid": {"description": "会话id", "type": "string", "x-display": true}}, "type": "object"}}}, "description": "success"}}, "summary": "图片理解"}}}, "servers": [{"description": "a server description", "url": "http://core-aitools:18668"}]}',
  '2025-10-24 10:00:00',
  '2025-10-24 10:00:00'
);""",
    """INSERT INTO tools_schema (app_id, tool_id, name, description, open_api_schema, create_at, update_at)
VALUES (
  'appid',
  'tool@8b2282136021000',
  'OCR',
  '识别图片或PDF文件中的文字内容，目前支持PDF、PNG、JPG',
  '{"info": {"title": "agentBuilder toolset", "version": "1.0.0", "x-is-official": false}, "openapi": "3.1.0", "paths": {"/aitools/v1/ocr": {"post": {"description": "识别图片或PDF文件中的文字内容，目前支持PDF、PNG、JPG", "operationId": "OCR-9dRrb94M", "requestBody": {"content": {"application/json": {"schema": {"properties": {"file_url": {"description": "图片或pdf文件的url地址", "type": "string", "x-display": true, "x-from": 2}, "page_end": {"default": -1, "description": "当传入的是pdf链接，表示页码结束范围，-1表示全部页码，从0开始；图片链接不影响该值输入", "type": "integer", "x-display": true, "x-from": 2}, "page_start": {"default": -1, "description": "当传入的是pdf链接，表示页码开始范围，-1表示全部页码，从0开始；图片链接不影响该值输入", "type": "integer", "x-display": true, "x-from": 2}}, "required": ["file_url"], "type": "object"}}}, "required": true}, "responses": {"200": {"content": {"application/json": {"schema": {"properties": {"code": {"description": "状态码", "type": "integer", "x-display": true}, "data": {"description": "识别结果", "items": {"properties": {"content": {"description": "页面内容", "items": {"properties": {"source_data": {"description": "源数据", "type": "string", "x-display": true}, "name": {"description": "名称", "type": "string", "x-display": true}, "value": {"description": "内容", "type": "string", "x-display": true}}, "required": [], "type": "object"}, "type": "array", "x-display": true}, "file_index": {"description": "页码", "type": "integer", "x-display": true}}, "required": [], "type": "object"}, "type": "array", "x-display": true}, "message": {"description": "操作信息", "type": "string", "x-display": true}}, "type": "object"}}}, "description": "success"}}, "summary": "OCR"}}}, "servers": [{"description": "a server description", "url": "http://core-aitools:18668"}]}',
  '2025-10-24 10:00:00',
  '2025-10-24 10:00:00'
);""",
]
