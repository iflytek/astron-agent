#!/bin/bash

# Common Module Test Runner
# 运行core/common模块的单元测试

set -e

# 设置环境变量
export PYTHONPATH="/Users/dl/XfProjects/xfyun_webdev_gitee/openstellar/core"

# 进入项目目录
cd "$(dirname "$0")"

echo "=========================================="
echo "Common Module Unit Tests"
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
echo "Running unit tests..."
echo ""

# 运行所有测试
uv run python -m pytest tests/ -v --cov=common --cov-report=term-missing --cov-report=html:htmlcov

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

# 显示覆盖率报告
echo "Coverage report generated in htmlcov/index.html"
echo ""

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Check the output above for details."
    exit 1
fi

