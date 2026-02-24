# Features and Usage FAQ

## Why does creating an agent in one sentence fail?

When creating an agent via prompt, if you click "Create Now", it requires calling the model capabilities of the iFlytek Open Platform. Please first bind AstronAgent to your iFlytek Open Platform application (refer to the deployment documentation), then obtain the quota for the corresponding model. Alternatively, click "Skip" to use third-party models for conversation.

## Workflow creation failure or display anomaly (Unknown column)?

1. Cause: Database table structure version is outdated.
2. Solution: Check backend logs. If errors like `Unknown column 'module_id'` or `type` appear, you need to execute corresponding `ALTER TABLE` statements in the database to add missing fields (e.g., `alter table c_param add column module_id varchar(50) DEFAULT NULL`).

## Common Knowledge Base (Knowledge Base) questions?

1. File upload failure:
   - Check if MinIO service is normal and if ports (such as 18998/18999) are open.
   - Check network connectivity and environment variable configuration between Agent and RAGFlow/MinIO.
2. RAGFlow sync: Currently supports sync from Agent upload to RAGFlow; files uploaded directly in RAGFlow need to be associated in the Agent side to be used.
3. Rerank model: Spark knowledge base enables Rerank by default.

## How to use virtual humans?

To use virtual human technology in AstronAgent, you need to apply for the corresponding service on the iFlytek Virtual Human official website and configure it in environment variables:
1. Open the iFlytek Virtual Human official website https://virtual-man.xfyun.cn/ and enter the application console
2. Click "Interface Service" on the left sidebar
3. Click "Free Activation" on the right details
4. Fill in the form with your information and submit
5. After successful submission, the page will automatically redirect. If you enter later, you can directly click "My Subscriptions" on the left
6. Click "Create Interface Service"
7. Click "Create Interface Service" in the top right, fill in the form
8. Get the application triple information and click the publish button
9. Fill the application triple information into the corresponding configuration items in .env, start/restart the docker compose service to use

⚠️ Special note: Since virtual humans need to use the browser's media capture API `navigator.mediaDevices`, a secure environment like HTTPS or localhost is required. If you don't have such an environment, Chrome browser can be set to bypass the check, specific settings as follows:
1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Search for "Insecure origins treated as secure", find this item and set to: Enabled (otherwise it will not be effective)
3. Enter your address in the input box, such as: `http://172.29.192.11`, if there are multiple, separate them with English commas
4. Save and restart the browser to take effect

## How to use variables?

1. Reference method: Use `{{variable_name}}` in node input boxes to reference upstream node outputs or global variables.
2. Iterator node: Inside the iterator node, use the current iteration item variable (such as `item`) for processing.

## How to customize atomic components?

Currently requires code modification and manually updating atomic tree information in the database. Future versions will provide a more convenient way to develop custom components.

## Does it support custom MCP (Model Context Protocol) tools?

Yes. You can add and configure MCP tools in workflow nodes on the Web side (such as Agent intelligent decision nodes).

## Knowledge base (RAG) citation issues, unable to retrieve or answer?

1. Early versions of conversational Agents may have bugs when citing knowledge bases; it is recommended to update to the latest version of the image.
2. Citing knowledge bases in workflow mode is usually more stable.

## How does the knowledge base (RAG) prevent model hallucinations?

1. Retrieved knowledge base content will be filled into the Prompt and sent to the model as context.

2. You can constrain the model by modifying the prompt: for example, adding "Please answer based only on the retrieved content. If there is no answer in the retrieved content, please reply directly that you don't know, do not make it up."

## How to delete or take down published applications?

- Current version (open source version) may not directly provide a "Take Down" button on the interface.
- Usually need to look for delete options in the "My Agents" card.
- If you can't find the take down/delete entry, it may be a known issue (Issue) in the current version. It is recommended to follow the GitHub repository's repair progress.

## How to use HTTPS protocol to access the project?

1. Modify the configuration file, as shown in the figure, add HTTPS exposure interface, and modify CONSOLE_DOMAIN environment variable.
2. Modify the nginx container configuration in docker-compose.yaml file, expose HTTPS and casdoor port numbers, and map HTTPS certificate files.
3. Modify docker/astronAgent/nginx/nginx.conf configuration file to adapt to HTTPS protocol (see Chinese version for detailed configuration)
