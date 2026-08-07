UPDATE workflow_version
SET publish_result = '成功'
WHERE publish_result = 'SUCCESS';

UPDATE workflow_version
SET publish_result = '失败'
WHERE publish_result = 'FAILED';
