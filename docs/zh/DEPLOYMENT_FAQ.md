# 部署常见问题 FAQ

> 当前 Python Console 分阶段迁移只交付账号功能。升级前按 [运维说明](../../console/backend/README.md) 保留数据并导入旧用户；旧用户保留 UID，由管理员发放重设密码链接。

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
- 确保所有环境变量配置正确后再启动服务

---

## 2. 部署后页面无法访问怎么办？

先检查应用入口、Console 健康状态和日志，确认当前前后端镜像均由迁移分支构建，并核对数据库、Redis、域名与 Cookie 设置。当前阶段只支持账号页面；未迁移业务返回错误并不代表用户数据丢失。

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

- [部署指南（带认证）](./DEPLOYMENT_GUIDE_WITH_AUTH.md)
- [部署指南（不带认证）](./DEPLOYMENT_GUIDE.md)
