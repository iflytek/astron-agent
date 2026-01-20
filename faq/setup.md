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

1. 检查端口: 默认使用8000（Casdoor），80（Nginx），18998（MINIO) 等端口。
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

## 启动时遇到 request returned 500 Internal Server Error  报错？

这通常是环境状态不一致导致的，请尝试以下步骤：
1. 备份重要数据。
2. 执行 docker compose -f docker-compose-with-auth.yaml down -v 清理容器和
数据卷（注意：此步骤会删除数据）。
3. 运行 git restore docker 恢复 docker 目录下的文件修改。
4. 检查环境变量 ASTRON_AGENT_VERSION 是否设置为稳定版（如 v1.0.0-rc.x ）。
5. 重新执行 docker compose -f docker-compose-with-auth.yaml up -d  启动服务。
6. 清理浏览器缓存或使用无痕模式访问。
