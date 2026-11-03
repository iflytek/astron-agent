# 安装与启动 FAQ

## 镜像拉取失败 (Download failed) 或速度慢？

这通常是由于国内网络连接 Docker Hub 不稳定导致的。
1. 配置镜像源: 在 /etc/docker/daemon.json  中配置国内加速镜像（如阿里云、网易、南京大
学等）。
- 示例：ghcr.nju.edu.cn  可作为 ghcr.io  的替代。
2. 修改配置: 编辑 docker-compose.yaml ，将镜像地址中的 ghcr.io/  替换为国内镜像源地
址（如 ghcr.nju.edu.cn/ ）。
3. 网络代理: 确保服务器可以访问外部网络，或配置 Docker 代理。

## 启动时提示端口被占用 (Port occupied)？

1. 检查端口: 默认使用80（Nginx），18998（MINIO) 等端口。
2. 修改配置: 在 .env  文件中修改冲突服务的端口映射。
3. Docker冲突: 确保没有旧的容器在运行。尝试 docker compose down 清理后再启动。

## 部署后访问 404 或 502 Bad Gateway？

1. 检查日志: 执行 docker compose logs -f 查看 astron-agent-console-hub或nginx的报错。
2. 等待启动: 服务启动需要时间，特别是第一次拉取镜像和初始化数据库时，请耐心等待。
3. 配置检查: 确认 .env 中的 HOST_BASE_ADDRESS 配置正确（远程部署时应为公网IP/域名，而非localhost）。

## 必须安装 Docker 吗？

是的，Astron Agent 平台依赖 Docker 进行容器化部署。

## 如何更新到最新版本？

1. 拉取代码: git pull origin main
2. 更新镜像: docker compose pull
3. 重启服务:
```
docker compose down
docker compose up -d
```
注意: 如果涉及数据库字段变更，可能需要执行数据库迁移。如果测试环境允许，可使用
docker compose down -v 清空数据重新初始化（慎用，会删除所有数据）。

## Windows 上运行对 Docker Desktop 版本有要求吗？

建议使用 Docker Desktop 4.x 及以上版本，最好使用最新的稳定版，以避免 API 版本不匹配等兼容性问题。

## 启动时遇到 500 Internal Server Error？

先查看 Console 日志与健康状态，检查数据库、Redis、密钥和公开 origin 配置。当前前后端必须由同一迁移分支构建；旧账号导入有冲突时按错误信息提供显式用户名映射。不要清空数据卷或重新初始化业务表。详见 [Python Console 运维说明](../console/backend/README.md)。

## 如何正确修改默认端口（80）？

在 `.env` 文件中修改 `EXPOSE_NGINX_PORT` 等相关端口配置，然后重建容器生效（`docker compose down` 后 `docker compose up -d`）。

修改访问端口后，同步更新内部账号的公开 origin、允许主机与代理配置，详见[配置与认证 FAQ](config.md)。

## 为什么用了 `latest` 镜像却不是最新的？如何切换镜像版本？

Docker 的 `latest` 标签只在本地没有该镜像时才会真正去拉取，之后会一直复用本地缓存。

- 想更新到最新：必须显式执行 `docker compose pull`，再 `docker compose up -d`。
- 想锁定版本：在 `.env` 中把 `ASTRON_AGENT_VERSION` 从 `latest` 改成具体版本号（如 `v1.0.0`）。

生产环境推荐锁定具体版本号而不是使用 `latest`，这样环境可控、可回滚。

## 支持在 ARM 架构的机器上部署吗？

支持。`docker compose up` 会读取 `docker-compose.yml` 中的 `image` 字段并执行 `docker pull`，Docker 引擎会根据当前运行环境自动选择匹配的架构版本（在 ARM Mac 上拉取 arm64 镜像，在 x86 服务器上拉取 amd64 镜像）。

## 项目重启后用户数据丢失？

检查 Console 数据库连接是否指向原实例，数据卷是否持久化，以及所有副本是否使用同一持久密钥。旧用户导入保持 UID，不重新初始化业务表；不要删除数据卷或运行旧 Flyway 初始化。参考 [Python Console 运维说明](../console/backend/README.md)。

## 打开 RPA 客户端卡在加载界面？

当前 Console 身份迁移不包含外部 RPA 身份系统；Agent 与 RPA 联合集成暂不可用，将在发布与渠道阶段恢复。

## Astron RPA 客户端支持国产信创或麒麟系统吗？

开源版暂不支持，仅企业版支持。开源版客户端目前只支持 Windows。
