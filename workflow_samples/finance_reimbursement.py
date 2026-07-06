"""
Sample fixed workflow: Finance Reimbursement Processing
This represents a pre-defined, secure RPA workflow.
In production, this would be a script or configuration for the RPA platform.
"""

def execute(execution_id: str, payload: dict):
    """
    Executes the finance reimbursement workflow steps.
    Steps:
    1. Validate input data
    2. Approve via human-in-the-loop (simulated)
    3. Process payment
    4. Log completion
    For demo purposes, this is a stub.
    """
    print(f"Executing finance reimbursement workflow for execution {execution_id}")
    print(f"Payload: {payload}")
    # In real implementation, use RPA tools to interact with systems
    return {"status": "completed", "execution_id": execution_id}
