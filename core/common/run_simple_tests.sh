#!/bin/bash

# Simple test runner for common module
# 运行common模块的简单测试

set -e

# 设置环境变量
export PYTHONPATH="/Users/dl/XfProjects/xfyun_webdev_gitee/github/astra-agent/core"

# 进入项目目录
cd "$(dirname "$0")"

echo "=========================================="
echo "Common Module Simple Tests"
echo "=========================================="
echo ""

# 检查uv是否安装
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install uv first."
    exit 1
fi

# 检查Python环境
echo "Python Environment:"
uv run python --version
echo ""

# 运行测试
echo "Running simple tests..."
echo ""

# 运行异常处理测试
echo "Running exception tests..."
uv run python -m pytest tests/test_exceptions.py -v

echo ""

# 运行服务基础类测试
echo "Running service base tests..."
uv run python -m pytest tests/test_service_base.py -v

echo ""

# 运行OTLP工具测试
echo "Running OTLP utils tests..."
uv run python -m pytest tests/test_otlp_utils.py -v

echo ""

# 运行工具函数测试
echo "Running utils tests..."
uv run python -m pytest tests/test_utils.py -v

echo ""

# 运行主模块测试
echo "Running main module tests..."
uv run python -m pytest tests/test_main.py -v

echo ""
echo "=========================================="
echo "Simple Test Summary"
echo "=========================================="
echo ""

echo "✅ Simple tests completed!"
echo "All basic functionality tests have been run."
