import json
import logging
from datetime import datetime
from rpa_robot import RPARobot

class AstronAgent:
    def __init__(self):
        self.rpa_robot = RPARobot()
        self.audit_log = []
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def execute_workflow(self, workflow_id, params):
        """执行指定工作流，包含权限校验和人工审批"""
        self.logger.info(f"Received workflow execution request: {workflow_id}")
        
        # 1. 权限校验
        if not self._check_permission(workflow_id, params):
            raise PermissionError("Insufficient permissions to execute this workflow")

        # 2. 人工审批 (Human-in-the-loop)
        if not self._request_approval(workflow_id, params):
            self._log_audit('approval_denied', workflow_id, params)
            raise Exception("Workflow execution denied by human approver")

        # 3. 调度 RPA 机器人执行
        result = self.rpa_robot.execute(workflow_id, params)

        # 4. 记录审计日志
        self._log_audit('success', workflow_id, params, result)

        return result

    def _check_permission(self, workflow_id, params):
        """权限校验：检查 workflow_id 是否需要特殊权限，以及用户是否具备"""
        # 模拟权限校验逻辑
        allowed_workflows = ['financial_reimbursement', 'contract_entry', 'system_data_modification']
        if workflow_id not in allowed_workflows:
            return False
        # 这里可加入更细粒度的权限检查
        return True

    def _request_approval(self, workflow_id, params):
        """请求人工审批，返回 True 表示批准"""
        # 模拟审批：默认批准
        # 实际实现中可调用审批系统 API
        self.logger.info(f"Requesting human approval for workflow: {workflow_id}")
        # 假设审批通过
        return True

    def _log_audit(self, status, workflow_id, params, result=None):
        """记录审计日志"""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'workflow_id': workflow_id,
            'params': params,
            'status': status,
            'result': result
        }
        self.audit_log.append(entry)
        self.logger.info(f"Audit log: {json.dumps(entry)}")

    def get_audit_log(self):
        """获取审计日志"""
        return self.audit_log