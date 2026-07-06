from .financial_reimbursement import FinancialReimbursementWorkflow

_workflows = {
    'financial_reimbursement': FinancialReimbursementWorkflow(),
}

def get_workflow(workflow_id):
    return _workflows.get(workflow_id)