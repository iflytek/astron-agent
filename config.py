import os

# OpenClaw 鉴权配置
OPENCLAW_API_KEY = os.getenv('OPENCLAW_API_KEY', 'default-openclaw-key')

# Astron Agent 服务配置
ASTRON_AGENT_HOST = os.getenv('ASTRON_AGENT_HOST', '0.0.0.0')
ASTRON_AGENT_PORT = int(os.getenv('ASTRON_AGENT_PORT', '8000'))
ASTRON_AGENT_API_KEY = os.getenv('ASTRON_AGENT_API_KEY', 'default-astron-key')

# RPA 机器人配置
RPA_ROBOT_ENDPOINT = os.getenv('RPA_ROBOT_ENDPOINT', 'http://rpa-robot:8080/execute')
RPA_ROBOT_API_KEY = os.getenv('RPA_ROBOT_API_KEY', 'default-rpa-key')

# 审核配置
APPROVAL_REQUIRED_FLOWS = ['finance_reimbursement', 'contract_entry', 'core_data_modification']
APPROVAL_TIMEOUT_SECONDS = 300  # 5分钟

# 日志配置
LOG_DIR = os.getenv('LOG_DIR', './logs')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
