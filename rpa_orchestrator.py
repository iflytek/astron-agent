import logging
from typing import Any, Dict
from workflows import get_workflow
from audit import AuditLogger

class RPAOrchestrator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.audit = AuditLogger()

    def execute_workflow(self, workflow_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        self.logger.info(f"Executing workflow {workflow_id} with params {params}")
        self.audit.log('workflow_triggered', {'workflow_id': workflow_id, 'params': params})
        workflow = get_workflow(workflow_id)
        if not workflow:
            self.logger.error(f"Workflow {workflow_id} not found")
            self.audit.log('workflow_failed', {'workflow_id': workflow_id, 'reason': 'not_found'})
            return {'status': 'error', 'message': 'Workflow not found'}
        # Permission check and human-in-the-loop would go here
        # For now, directly execute
        try:
            result = workflow.execute(params)
            self.audit.log('workflow_success', {'workflow_id': workflow_id, 'result': result})
            return {'status': 'success', 'data': result}
        except Exception as e:
            self.logger.exception(f"Workflow execution failed: {e}")
            self.audit.log('workflow_failed', {'workflow_id': workflow_id, 'error': str(e)})
            return {'status': 'error', 'message': str(e)}