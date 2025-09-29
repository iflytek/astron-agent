# OpenStellar Docker 部署指南

OpenStellar 微服务架构的 Docker Compose 一键部署方案，包含所有核心服务和必要的中间件。

## 🏗️ 架构概览

### 中间件服务 (Infrastructure)
- **PostgreSQL 14** - 主数据库，用于租户和内存服务
- **MySQL 8.4** - 应用数据库，用于控制台和Agent服务
- **Redis 7** - 缓存和会话存储
- **Elasticsearch 7.16.2** - 搜索引擎和知识库检索
- **Kafka 3.7.0** - 消息队列和事件流
- **MinIO** - 对象存储服务

### OpenStellar 核心服务 (Core Services)
- **core-tenant** (8001) - 租户管理服务
- **core-memory** (8002) - 内存数据库服务
- **core-rpa** (8003) - RPA插件服务
- **core-link** (8004) - 链接插件服务
- **core-aitools** (8005) - AI工具插件服务
- **core-agent** (8006) - Agent核心服务
- **core-knowledge** (8007) - 知识库服务
- **core-workflow** (8008) - 工作流引擎服务

### OpenStellar 控制台服务 (Console Services)
- **console-frontend** (3000) - 前端Web界面
- **console-hub** (8080) - 控制台核心API

## 🚀 快速开始

### 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 8GB 可用内存
- 至少 20GB 可用磁盘空间

### 1. 准备配置文件

```bash
# 复制环境变量配置模板
cd docker
cp .env.example .env

# 根据需要修改配置
vim .env
```

### 2. 启动所有服务

```bash
# 启动所有服务 (后台运行)
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f
```

### 3. 访问服务

- **控制台前端**: http://localhost:1881
- **控制台Hub API**: http://localhost:8080
- **MinIO 控制台**: http://localhost:9001 (minioadmin/minioadmin123)

### 核心服务端口

- **Agent**: http://localhost:17870
- **Workflow**: http://localhost:7880
- **Knowledge**: http://localhost:20010
- **Link**: http://localhost:18888
- **AITools**: http://localhost:18668
- **Tenant**: http://localhost:5052
- **Memory**: http://localhost:7990

## 📋 服务管理

### 启动特定服务

```bash
# 只启动中间件
docker-compose up -d postgres mysql redis elasticsearch kafka minio

# 只启动核心服务
docker-compose up -d core-tenant core-memory core-agent core-knowledge

# 只启动控制台服务
docker-compose up -d console-frontend console-hub console-toolkit
```

### 服务健康检查

```bash
# 查看所有服务健康状态
docker-compose ps

# 查看特定服务日志
docker-compose logs core-agent

# 进入容器调试
docker-compose exec core-agent bash
```

### 数据管理

```bash
# 查看数据卷
docker volume ls | grep openstellar

# 备份数据库
docker-compose exec postgres pg_dump -U openstellar openstellar > backup.sql
docker-compose exec mysql mysqldump -u openstellar -p openstellar > backup.sql

# 清理数据 (⚠️ 注意：会删除所有数据)
docker-compose down -v
```

## 🔧 配置说明

### 环境变量

主要配置项在 `.env` 文件中：

```bash
# 数据库配置
POSTGRES_PASSWORD=openstellar123
MYSQL_PASSWORD=openstellar123

# 端口配置 (可根据需要修改)
CONSOLE_FRONTEND_PORT=3000
CONSOLE_HUB_PORT=8080

# 镜像版本
OPENSTELLAR_TAG=latest
```

### 自定义配置

#### Redis 配置
如需启用Redis密码认证，在.env文件中设置：
```bash
# 启用Redis密码认证
REDIS_PASSWORD=your-secure-password
```

#### 数据库初始化
- PostgreSQL: `init-scripts/postgres/01-init-databases.sql`
- MySQL: `init-scripts/mysql/01-init-databases.sql`

可以添加自定义的初始化SQL脚本。

## 🌐 网络配置

所有服务运行在 `openstellar-network` 网络中：
- 网段: 172.20.0.0/16
- 服务间通过服务名通信 (如: postgres:5432)

## 💾 数据持久化

以下数据会持久化存储：
- `postgres_data` - PostgreSQL 数据
- `mysql_data` - MySQL 数据
- `redis_data` - Redis 数据
- `elasticsearch_data` - Elasticsearch 索引
- `kafka_data` - Kafka 消息
- `minio_data` - MinIO 对象存储

## 🔍 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 查看详细错误信息
docker-compose logs service-name

# 检查资源使用情况
docker stats

# 检查端口占用
netstat -tlnp | grep :8080
```

#### 2. 数据库连接失败
```bash
# 检查数据库服务状态
docker-compose exec postgres pg_isready -U openstellar
docker-compose exec mysql mysqladmin ping -h localhost

# 重启数据库服务
docker-compose restart postgres mysql
```

#### 3. 内存不足
```bash
# 减少中间件内存配置
# 编辑 docker-compose.yaml
ES_JAVA_OPTS: "-Xms256m -Xmx256m"

# 或只启动必要服务
docker-compose up -d postgres mysql redis console-hub console-frontend
```

#### 4. 镜像拉取失败
```bash
# 检查网络连接
docker pull postgres:14

# 使用国内镜像源
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
```

### 性能优化

#### 1. 资源分配
```yaml
# 在 docker-compose.yaml 中为服务添加资源限制
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

#### 2. 数据库优化
```bash
# PostgreSQL
shared_buffers = 256MB
effective_cache_size = 1GB

# MySQL
innodb_buffer_pool_size = 512M
```

## 🔒 安全配置

### 生产环境建议

1. **修改默认密码**：
   ```bash
   # 修改 .env 文件中的所有密码
   POSTGRES_PASSWORD=your-strong-password
   MYSQL_PASSWORD=your-strong-password
   MINIO_ROOT_PASSWORD=your-strong-password
   ```

2. **启用 Redis 认证**：
   ```bash
   # 编辑 config/redis.conf
   requirepass your-redis-password
   ```

3. **配置防火墙**：
   ```bash
   # 只暴露必要端口
   # 生产环境建议使用反向代理
   ```

4. **SSL/TLS 配置**：
   ```bash
   # 为 Web 服务配置 HTTPS
   # 使用 nginx 或 traefik 作为反向代理
   ```

## 📚 其他资源

- [OpenStellar 官方文档](https://docs.openstellar.cn)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [故障排除指南](./TROUBLESHOOTING.md)

## 🤝 贡献

如有问题或建议，请提交 Issue 或 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证。