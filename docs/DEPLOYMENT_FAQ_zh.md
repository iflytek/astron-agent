# 部署常见问题 FAQ

本文档收集了 Astron Agent 部署过程中的常见问题和解决方案。

---

## 1. 怎么升级项目？

如果您已经部署了 Astron Agent，想要升级到最新版本，请按照以下步骤操作

### 升级步骤

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 停止所有服务（包含 Casdoor）
docker compose -f docker-compose-with-auth.yaml down

# 拉取新代码
git fetch
git pull

# 拉取新镜像
docker compose -f docker-compose-with-auth.yaml pull

# 重新按照部署文档配置启动
# 请参考 DEPLOYMENT_GUIDE_WITH_AUTH_zh.md 进行配置和启动
```

### 注意事项

- 升级前建议备份重要数据
- 如果您使用的是不带认证的版本，请将 `docker-compose-with-auth.yaml` 替换为 `docker-compose.yaml`
- 升级后请检查配置文件是否需要更新
- 确保所有环境变量配置正确后再启动服务

---

## 2. 部署完成后打不开页面怎么办？

请按照以下步骤逐一排查（操作前请务必备份重要数据）

1. 执行 `docker compose -f docker-compose-with-auth.yaml down -v` 清理容器和数据卷，该步骤会删除所有数据。
2. 运行 `git restore docker` 清理 `docker` 目录下的改动，恢复为仓库版本。
3. 将 `ASTRON_AGENT_VERSION` 环境变量设置为稳定版 `v1.0.0-rc.x`。
4. 按照部署文档重新配置其余环境变量，确保取值正确。
5. 执行 `docker compose -f docker-compose-with-auth.yaml up -d` 重新启动所有服务。
6. 清理浏览器缓存，或直接使用无痕模式访问页面。

---

## 3. 因为网络问题导致官方镜像拉取失败怎么办？

1. 对于 astron-agent 项目自身的镜像，编辑 `docker/astronAgent/docker-compose.yaml`，将相关容器 `image` 字段中的 `ghcr.io/` 前缀替换为 `ghcr.nju.edu.cn/`。
2. 对于中间件等第三方镜像，请将 Docker 的镜像源切换为国内源，如 `https://docker.nju.edu.cn`、`https://docker.xuanyuan.me`、`https://docker.mirrors.ustc.edu.cn` 等。

---

## 4. 因为网络原因导致 `git clone` 失败怎么办？

1. 使用国内镜像站执行 clone，例如：`git clone https://gitclone.com/github.com/iflytek/astron-agent.git`
2. 如需更多镜像站，可参考 `https://freevaults.com/github-mirror-daily-updates.html` 等持续更新的镜像列表。

---

## 相关文档

- [部署指南（带认证）](./DEPLOYMENT_GUIDE_WITH_AUTH_zh.md)
- [部署指南（不带认证）](./DEPLOYMENT_GUIDE_zh.md)
