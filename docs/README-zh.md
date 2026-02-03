[![Astron_Readme](./imgs/Astron_Readme.png)](https://agent.xfyun.cn)

<div align="center">

[![License](https://img.shields.io/badge/license-apache2.0-blue.svg)](../LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/iflytek/astron-agent?style=social)](https://github.com/iflytek/astron-agent/stargazers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/iflytek/astron-agent)

[English](../README.md) | 简体中文

</div>

## 🔭 星辰 Agent 是什么

星辰Agent是一个**企业级、商业友好**的 Agentic Workflow开发平台，融合了 AI 工作流编排、模型管理、AI 与 MCP 工具集、RPA 自动化和团队空间等特性。
平台支持**高可用部署**，帮助企业快速构建**可规模化落地**的智能体应用，打造面向未来的 AI 基座。

### 为什么选择 星辰 Agent？
- **稳定可靠**：核心技术与[讯飞星辰Agent平台](https://agent.xfyun.cn)保持一致，具备企业级高可靠性，完整的高可用版本开源。
- **跨系统连接**：原生融合智能 RPA，高效打通企业内外部系统，实现 Agent 与企业系统互通。
- **企业级开放生态**：深度适配多类行业模型与工具，支持自定义扩展，灵活支持多种企业场景。
- **商业友好**：基于 Apache 2.0 协议开源，无任何商业限制，可自由商用使用。

### 关键特性
- **企业级高可用**：全链路能力覆盖开发、构建、优化与管控，支持高可用集群，一键部署，稳定可靠。
- **智能RPA融合**：跨系统流程自动化，让Agent具备高可控执行力，实现“从决策到动作”的完整闭环。
- **即用工具生态**：集成[讯飞开放平台](https://www.xfyun.cn)海量AI能力与工具，历经数百万开发者验证，免开发快速接入。
- **灵活模型支持**：多种接入方式，支持大模型API快速接入验证到企业级MaaS本地集群一键部署，满足不同规模需求。

## 📰 新闻动态

- **[Astron 黑客松@2025科大讯飞全球1024开发者节](https://luma.com/9zmbc6xb)**  🎤 <a href="https://github.com/mklong"><img src="https://github.com/mklong.png" width="20" align="center" /> @mklong</a>
- **[Astron Agent 郑州见面会](https://github.com/iflytek/astron-agent/discussions/672)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a> <a href="https://github.com/wowo-zZ"><img src="https://github.com/wowo-zZ.png" width="20" align="center" /> @wowo-zZ</a>
- **[Astron on Campus @ 浙江财经大学](https://mp.weixin.qq.com/s/oim_Z0ckgpFwf5jOskoJuA)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>
- **[Astron Agent & RPA 青岛城市行 · 落地 Agentic AI！](https://github.com/iflytek/astron-agent/discussions/740)**  🎤 <a href="https://github.com/vsxd"><img src="https://github.com/vsxd.png" width="20" align="center" /> @vsxd</a> <a href="https://github.com/doctorbruce"><img src="https://github.com/doctorbruce.png" width="20" align="center" /> @doctorbruce</a> <a href="https://github.com/MaxwellJean"><img src="https://github.com/MaxwellJean.png" width="20" align="center" /> @MaxwellJean</a>
- **[Astron训练营·第一期](https://www.aidaxue.com/astronCamp)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>
- **[Astron Talk @ 重庆 Mini Tech Fest](https://mp.weixin.qq.com/s/HROf1zZpkPVDSsCQrv2jRg)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>

## 🚀 快速开始

我们提供两种部署方式，满足不同场景需求:

### 方式一：Docker Compose（推荐快速体验）

```bash
# 克隆项目
git clone https://github.com/iflytek/astron-agent.git

# 进入 astronAgent 目录
cd astron-agent/docker/astronAgent

# 复制环境变量配置
cp .env.example .env

# 环境变量配置
vim .env
```

环境变量配置请参考文档：[DEPLOYMENT_GUIDE_WITH_AUTH_zh.md](https://github.com/iflytek/astron-agent/blob/main/docs/DEPLOYMENT_GUIDE_WITH_AUTH_zh.md#%E7%AC%AC%E4%BA%8C%E6%AD%A5%E9%85%8D%E7%BD%AE-astronagent-%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

```bash
# 启动所有服务（包含 Casdoor）
docker compose -f docker-compose-with-auth.yaml up -d
```

#### 📊 服务访问地址

启动完成后，您可以通过以下地址访问各项服务：

**认证服务**
- **Casdoor 管理界面**：http://localhost:8000

**AstronAgent**
- **应用前端(nginx代理)**：http://localhost/

**说明**
- Casdoor默认的登录账户名：`admin`，密码：`123`

### 方式二：Helm（适用于 Kubernetes 环境）

> 🚧 **注意**：Helm charts 正在完善中，敬请期待！

```bash
# 即将推出
# helm repo add astron-agent https://iflytek.github.io/astron-agent
# helm install astron-agent astron-agent/astron-agent
```

---

> 📖 完整的部署说明和配置详情，请查看[部署指南](DEPLOYMENT_GUIDE_WITH_AUTH_zh.md)

## 📖 使用星辰Agent云服务

**快速体验**：星辰Agent提供一个即开即用的云服务环境，用于创建和管理智能体。免费快速体验地址： [https://agent.xfyun.cn](https://agent.xfyun.cn)。

**使用手册**：详细使用请参考 [快速开始](https://www.xfyun.cn/doc/spark/Agent03-%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.html)。

## 📚 文档

- [🚀 部署指南](DEPLOYMENT_GUIDE_zh.md)
- [🔧 配置说明](CONFIGURATION_zh.md)
- [🚀 快速开始](https://www.xfyun.cn/doc/spark/Agent02-%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B.html)
- [📘 开发指南](https://www.xfyun.cn/doc/spark/Agent03-%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.html#_1-%E6%8C%87%E4%BB%A4%E5%9E%8B%E6%99%BA%E8%83%BD%E4%BD%93%E5%BC%80%E5%8F%91)
- [💡 最佳实践](https://www.xfyun.cn/doc/spark/AgentNew-%E6%8A%80%E6%9C%AF%E5%AE%9E%E8%B7%B5%E6%A1%88%E4%BE%8B.html)
- [📱 应用案例](https://www.xfyun.cn/doc/spark/Agent05-%E5%BA%94%E7%94%A8%E6%A1%88%E4%BE%8B.html)
- [❓ FAQ](https://www.xfyun.cn/doc/spark/Agent06-FAQ.html)

## 🤝 参与贡献

我们欢迎任何形式的贡献！请查看 [贡献指南](CONTRIBUTING_CN.md)

## 🌟 Star 历史

<div align="center">
  <img src="https://api.star-history.com/svg?repos=iflytek/astron-agent&type=Date" alt="Star 历史图表" width="600">
</div>

## 📞 支持

- 💬 社区讨论: [GitHub Discussions](https://github.com/iflytek/astron-agent/discussions)
- 🐛 问题反馈: [Issues](https://github.com/iflytek/astron-agent/issues)
- 👥 企业微信群:

<div align="center">
  <img src="./imgs/WeCom_Group.png" alt="企业微信群" width="300">
</div>

## 📄 开源协议

本项目基于 [Apache 2.0 License](../LICENSE) 协议开源，允许自由使用、修改、分发，并可无限制地进行商业使用。
