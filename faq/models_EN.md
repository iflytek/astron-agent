# Models and AI Features FAQ

## Model dropdown is empty, unable to add models?

1. Platform configuration: Add models in "Model Management" of Astron Console.
2. Network connectivity: Ensure the container can access external model APIs (such as Spark, DeepSeek, OpenAI).

## How to configure DeepSeek or other OpenAI compatible models?

1. Select "Create Model" in "Model Management".
2. Interface address: Fill in the corresponding API address.
3. API key: Fill in the corresponding Key.

## Add local model reports IP in blacklist?

Default configuration may prohibit connections to private network segments.
- Solution: Enter the database and delete or clear records with `category = 'NETWORK_SEGMENT_BLACK_LIST'` in the `config_info` table.

## Shows "consumed 0 token" when debugging successfully?

Some models indeed do not return token consumption when called via OpenAI SDK, as shown below, usage is null.

## How to configure local services (such as locally deployed large models) for Agent calls?

1. Network interoperability: Ensure that services within Docker containers can access host or LAN services.
   - Do not use `localhost` or `127.0.0.1`, as this will point to the container itself.
   - Use the host's LAN IP (such as `192.168.x.x`) or Docker's special DNS `host.docker.internal` (depending on Docker version and system).

2. Blacklist restriction: Default configuration may prohibit connections to private network segments (such as `192.168.x.x`). If interception is encountered, you need to modify the blacklist configuration in the database table `config_info` (or `config_info_en`).

## Image understanding/OCR plugin error?

1. Configure `PLATFORM_APP_ID`, `PLATFORM_API_KEY`, `PLATFORM_API_SECRET` from iFlytek Open Platform in `.env`.
2. Ensure that the APPID has opened the corresponding image recognition/OCR capability permissions on the iFlytek Open Platform.

## How to obtain and use Spark knowledge base resources?

If you need to use Spark knowledge base, the official provides a tool to create Spark knowledge base and obtain knowledge base dataset:
1. Go to iFlytek Open Platform to open knowledge base capability: https://console.xfyun.cn/services/aidoc
2. Create Spark knowledge base, get `XINGHUO_DATASET_ID`
3. After getting the dataset ID, please update the dataset ID to environment variable `XINGHUO_DATASET_ID`
4. Use `xinghuo_rag_tool` to get `XINGHUO_DATASET_ID` (need to open html with browser)
   ```
   # Open from project
   cd astron-agent/docs/
   open xinghuo_rag_tool.html
   # Download xinghuo_rag_tool - method 1
   wget https://raw.githubusercontent.com/iflytek/astron-agent/refs/heads/main/docs/xinghuo_rag_tool.html
   # Download directly from github - method 2
   https://github.com/iflytek/astron-agent/blob/main/docs/xinghuo_rag_tool.html
   ```
