# 部署常见问题 FAQ

> Python Console 提供账号、空间、资源、Agent、工作流和发布管理。升级前按 [运维说明](../../console/backend/README.md) 保留数据并导入旧用户；旧用户保留 UID，由管理员发放重设密码链接。

本文档收集了 Astron Agent 部署过程中的常见问题和解决方案。

---

## 1. 怎么升级项目？

如果您已经部署了 Astron Agent，想要升级到最新版本，请按照以下步骤操作

### 升级步骤

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 停止服务
docker compose -f docker-compose.yaml down

# 拉取新代码
git fetch
git pull

# 拉取新镜像
docker compose -f docker-compose.yaml pull

# 重新按照部署文档配置启动
# 请参考 DEPLOYMENT_GUIDE_WITH_AUTH.md（docs/zh/） 进行配置和启动
```

### 注意事项

- 升级前建议备份重要数据
- 升级后请检查配置文件是否需要更新
- 默认 Compose 及服务器 IP 访问无需修改 `.env`；升级时只需核对已有的显式覆盖配置

---

## 2. 部署后页面无法访问怎么办？

先检查应用入口、Console 健康状态和日志，确认当前前后端镜像均由同一版本构建，并核对数据库、Redis、域名与 Cookie 设置。若业务页面失败，检查对应 Console 接口及下游核心服务日志；不能仅凭请求失败认定数据丢失。

保留数据库与数据卷，不执行清空数据的重装步骤。已有用户的导入与重设流程见 [Python Console 运维说明](../../console/backend/README.md)。

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

- [账号配置与迁移](./DEPLOYMENT_GUIDE_WITH_AUTH.md)
- [完整部署指南](./DEPLOYMENT_GUIDE.md)
