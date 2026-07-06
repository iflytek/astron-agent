# OpenClaw -> Astron Agent -> RPA 集成

本模块实现了 OpenClaw 触发 Astron Agent 调度 RPA 机器人执行安全操作的功能。

## 架构

1. OpenClaw 发送 POST 请求到 webhook_receiver 的 `/trigger` 端点。
2. webhook_receiver 进行鉴权后，调用 AstronAgent 的 `execute_workflow` 方法。
3. AstronAgent 执行权限校验、人工审批，然后调度 RPARobot 执行预定义流程。
4. 整个过程记录审计日志。

## 配置

- 设置环境变量 `OPENCLAW_TRIGGER_TOKEN` 为认证 token。
- 可在 `config.py` 中修改其他参数。

## 启动

安装依赖：`pip install -r requirements.txt`

运行：`python webhook_receiver.py`

## 测试

使用 curl 模拟 OpenClaw 触发：

```bash
curl -X POST http://localhost:5000/trigger \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "financial_reimbursement", "params": {"amount": 5000}}'
```

## 工作流列表

- financial_reimbursement: 财务报销
- contract_entry: 合同录入
- system_data_modification: 系统数据修改