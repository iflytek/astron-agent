# 快速开始

> 默认 Compose 启动无需复制或编辑 `.env`，无需填写任何环境变量。新用户访问 `/register`；旧用户保留 UID，由管理员发放重设密码链接。升级保留原业务数据和持久凭据。

本页用于承接首页的「开始阅读」入口，保留快速上手所需的最短路径；更完整的细节可以继续查看仓库内的中文部署文档。

## 适合谁先看

- 想先在本地验证内部账号功能的开发者
- 希望先拉起一套可登录、可访问的示例环境的团队
- 计划后续再切换到 Helm 或生产配置的使用者

## 两步完成本地体验

### 1. 克隆仓库

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
```

内置数据库、缓存、存储和账号配置可直接使用。模型与外部业务能力在启动后按需配置。

### 2. 启动服务

```bash
docker compose up -d --build
```

启动完成后，默认可以访问以下地址：

- Astron Agent 前端：本机 `http://localhost/`，远程 `http://<服务器IP>/`，默认端口 80。通过实际服务器 IP 访问同样无需修改环境变量。

## 推荐阅读顺序

1. 先读 [部署指南](/zh/guide/deploy)
2. 再读 [配置说明](/zh/guide/config)
3. 遇到问题时查看 [FAQ](/zh/faq)

## 深入文档

- [中文 README](/zh/README)
- [账号配置与迁移](/zh/DEPLOYMENT_GUIDE_WITH_AUTH)
- [标准部署指南](/zh/DEPLOYMENT_GUIDE)
