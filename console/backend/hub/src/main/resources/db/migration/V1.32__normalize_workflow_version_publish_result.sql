UPDATE workflow_version
SET publish_result = '成功'
WHERE publish_result IN ('Success', 'success', 'SUCCESS');

UPDATE workflow_version
SET publish_result = '失败'
WHERE publish_result IN ('Failed', 'failed', 'FAILED');

UPDATE workflow_version
SET publish_result = '审核中'
WHERE publish_result IN ('Under review', 'Reviewing', 'reviewing', 'REVIEWING');
