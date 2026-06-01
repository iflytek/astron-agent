# 快速开始

本页用于承接首页的「开始阅读」入口，保留快速上手所需的最短路径；更完整的细节可以继续查看仓库内的中文部署文档。

## 适合谁先看

- 想先在本地快速体验完整链路的开发者
- 希望先拉起一套可登录、可访问的示例环境的团队
- 计划后续再切换到 Helm 或生产配置的使用者

## 两步完成本地体验

### 1. 克隆仓库并准备环境变量

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
cp .env.example .env
```

完成复制后，按需补充模型、数据库、对象存储和鉴权相关配置。

## 2. 启动服务

```bash
docker compose -f docker-compose-with-auth.yaml up -d
```

启动完成后，默认可以访问以下地址：

- Astron Agent 前端：`http://localhost/`
- Casdoor 管理界面：`http://localhost:8000`

## 推荐阅读顺序

1. 先读 [部署指南](/guide/deploy)
2. 再读 [配置说明](/guide/config)
3. 遇到问题时查看 [FAQ](/faq)

## 深入文档

- [中文 README](/README-zh)
- [带鉴权部署指南](/DEPLOYMENT_GUIDE_WITH_AUTH_zh)
- [标准部署指南](/DEPLOYMENT_GUIDE_zh)
