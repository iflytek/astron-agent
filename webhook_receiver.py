import os
import json
from flask import Flask, request, jsonify
from astron_agent import AstronAgent

app = Flask(__name__)

# 从环境变量读取 token
AUTH_TOKEN = os.environ.get('OPENCLAW_TRIGGER_TOKEN', 'default-token')

# 初始化 Astron Agent
agent = AstronAgent()

@app.route('/trigger', methods=['POST'])
def handle_trigger():
    # 鉴权
    token = request.headers.get('Authorization')
    if not token or token != f'Bearer {AUTH_TOKEN}':
        return jsonify({'error': 'Unauthorized'}), 401

    # 解析请求体
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    workflow_id = data.get('workflow_id')
    params = data.get('params', {})

    if not workflow_id:
        return jsonify({'error': 'Missing workflow_id'}), 400

    # 调用 Astron Agent 执行工作流
    try:
        result = agent.execute_workflow(workflow_id, params)
        return jsonify({'status': 'success', 'data': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)