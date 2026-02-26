# PR：x-display 响应字段过滤缺失修复流程

## 一、问题现象
- 在托管工具中将对象/数组的子参数设置为关闭后，工作流单步执行结果仍返回这些字段。
- 复现场景使用 `https://jsonplaceholder.typicode.com/users/1`，预期关闭 `email` 与 `address.street` 后，响应中不应再出现这两个字段。

## 二、定位过程
- 先检查 agent 链路，发现 agent 侧已有响应过滤能力。
- 再检查 workflow 执行链路，确认 workflow 的 `Tool.run` 返回路径缺少同等过滤步骤。
- 结论：根因是两条链路过滤逻辑不一致，workflow 链路漏掉了 `x-display=false` 的响应裁剪。

## 三、修复方案
- 将响应过滤能力统一到 OpenAPI 相关目录：
  - [core/plugin/link/utils/open_api_schema/response_filter.py](core/plugin/link/utils/open_api_schema/response_filter.py)
- 复用现有 OpenAPI 解析能力提取 response schema：
  - [core/plugin/link/utils/open_api_schema/schema_parser.py](core/plugin/link/utils/open_api_schema/schema_parser.py)
  - 新增 `extract_response_json_schema`，统一 `200/201/202/203/204/default` 优先级，并优先 `application/json`。
- 两条执行链路统一调用同一实现：
  - [core/agent/service/plugin/link.py](core/agent/service/plugin/link.py)
  - [core/workflow/engine/nodes/plugin_tool/link_client.py](core/workflow/engine/nodes/plugin_tool/link_client.py)

## 四、优化点
- 性能：
  - 使用 trie 单次递归裁剪，避免多次路径遍历。
  - 删除无意义分支计算，减少每层递归开销。
- 兼容性：
  - 对非 dict 的 schema 输入做早返回保护，避免异常输入导致报错。
  - 校验器采用 `validator_for` 动态匹配 schema draft。
- 健壮性：
  - `hidden_paths` 为空时直接返回原 payload。
  - 路径树/响应 schema 非法类型时安全降级，不中断主流程。

## 五、验证结果
- 自动化测试：
  - `pytest -q core/workflow/tests/engine/nodes/test_link_client_filter.py` 通过（6 passed）。
  - `pytest -q core/agent/tests/test_plugin_base_link_mcp_workflow.py -k "response_filter or x_display or filter or hidden or toggle"` 通过（11 passed, 15 deselected）。
  - `pytest -q core/workflow/tests/engine/nodes/test_link_client_filter.py core/agent/tests/test_plugin_base_link_mcp_workflow.py -k "filter or x_display or response_filter or hidden or toggle"` 通过（17 passed, 15 deselected）。
- 业务结果：
  - `email` 与 `address.street` 在关闭后可被正确移除（字段名和值均不展示）。
  - 当子字段全部关闭时，父容器可保留空对象结构（如 `address: {}`）。
  - 父级节点关闭时，优先级高于子级开关（父关则该字段整体不展示）。
  - 同一份源响应中，字段从关闭切回开启后可恢复展示。
  - 本地 Docker 重建并启动验证通过。
    


