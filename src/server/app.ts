import express from 'express';
import { handleExecuteRequest } from './workflowEngine';

const app = express();
app.use(express.json());

app.post('/api/workflow/execute', handleExecuteRequest);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Workflow engine running on port ${PORT}`);
});
