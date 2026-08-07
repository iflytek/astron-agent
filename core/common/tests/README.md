# Common Module Tests

这个目录包含了 `common` 模块的单元测试。

## 测试结构

```
tests/
├── __init__.py              # 测试包初始化
├── conftest.py              # pytest 配置和 fixtures
├── test_main.py             # 主要模块集成测试
├── test_exceptions.py       # 异常处理模块测试
├── test_service_base.py     # 服务基础类测试
├── test_otlp_utils.py       # OTLP 工具函数测试
└── test_utils.py            # 工具函数测试
```

## 运行测试

### 运行所有测试

```bash
# 使用 uv 运行
uv run python -m pytest tests/ -v

# 使用现有的测试脚本
./run_tests.sh

# 使用简单测试脚本
./run_simple_tests.sh
```

### 运行特定测试

```bash
# 运行特定测试文件
uv run python -m pytest tests/test_exceptions.py -v

# 运行特定测试类
uv run python -m pytest tests/test_service_base.py::TestService -v

# 运行特定测试方法
uv run python -m pytest tests/test_exceptions.py::TestBaseExc::test_init_basic -v
```

## 测试模块说明

### test_exceptions.py
测试异常处理模块，包括：
- `BaseExc` 基础异常类
- `BaseCommonException` 通用异常类
- 各种具体异常类
- 错误代码常量

### test_service_base.py
测试服务基础类，包括：
- `Service` 抽象基类
- `ServiceFactory` 服务工厂基类
- `ServiceType` 服务类型枚举

### test_otlp_utils.py
测试 OTLP 工具函数，包括：
- IP 地址获取功能
- SID 生成器
- 各种工具函数

### test_utils.py
测试工具函数，包括：
- HMAC 认证工具
- 各种辅助函数

### test_main.py
测试主要模块的集成功能，包括：
- 模块导入测试
- 服务管理器单例模式
- 异常层次结构
- 各种工作流程

## 测试 Fixtures

在 `conftest.py` 中定义了常用的测试 fixtures：

- `mock_service`: 模拟服务对象
- `mock_service_factory`: 模拟服务工厂
- `sample_config`: 示例配置数据
- `mock_environment`: 模拟环境变量

## 添加新测试

### 1. 创建测试文件

```python
# tests/test_new_module.py
"""
Tests for new module
"""

import pytest
from common.new_module import NewClass


class TestNewClass:
    """Test NewClass functionality"""
    
    def test_basic_functionality(self):
        """Test basic functionality"""
        obj = NewClass()
        assert obj is not None
```

### 2. 使用 Fixtures

```python
def test_with_fixture(mock_service):
    """Test using fixture"""
    assert mock_service is not None
```

## 注意事项

1. 测试应该独立运行，不依赖外部服务
2. 使用 mock 对象模拟外部依赖
3. 测试应该覆盖正常情况和异常情况
4. 保持测试的简洁和可读性
5. 定期更新测试以适应代码变化