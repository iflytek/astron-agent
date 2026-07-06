import asyncio
import uuid
from datetime import datetime, timedelta
from config import APPROVAL_REQUIRED_FLOWS, APPROVAL_TIMEOUT_SECONDS
from audit_logger import audit_logger

class ApprovalManager:
    def __init__(self):
        self._pending_approvals = {}

    async def request_approval(self, flow_name: str, context: dict) -> bool:
        if flow_name not in APPROVAL_REQUIRED_FLOWS:
            audit_logger.log_event('APPROVAL_NOT_REQUIRED', {'flow': flow_name})
            return True
        approval_id = str(uuid.uuid4())
        approval_request = {
            'id': approval_id,
            'flow': flow_name,
            'context': context,
            'status': 'pending',
            'created_at': datetime.utcnow()
        }
        self._pending_approvals[approval_id] = approval_request
        audit_logger.log_event('APPROVAL_REQUESTED', approval_request)
        # 模拟异步等待人工审批（实际应通过消息队列等外部系统）
        try:
            approved = await asyncio.wait_for(
                self._wait_for_approval(approval_id),
                timeout=APPROVAL_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            audit_logger.log_error('APPROVAL_TIMEOUT', {'approval_id': approval_id})
            return False
        return approved

    async def _wait_for_approval(self, approval_id: str):
        # 生产环境中应通过轮询数据库或监听队列实现
        while True:
            if approval_id in self._pending_approvals:
                if self._pending_approvals[approval_id]['status'] != 'pending':
                    return self._pending_approvals[approval_id]['status'] == 'approved'
            await asyncio.sleep(2)

    def approve(self, approval_id: str):
        if approval_id in self._pending_approvals:
            self._pending_approvals[approval_id]['status'] = 'approved'
            audit_logger.log_event('APPROVAL_GRANTED', {'approval_id': approval_id})

    def reject(self, approval_id: str):
        if approval_id in self._pending_approvals:
            self._pending_approvals[approval_id]['status'] = 'rejected'
            audit_logger.log_event('APPROVAL_REJECTED', {'approval_id': approval_id})

approval_manager = ApprovalManager()
