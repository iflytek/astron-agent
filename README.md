[![Astron_Readme](./docs/imgs/Astron_Readme.png)](https://agent.xfyun.cn)

<div align="center">

[![License](https://img.shields.io/badge/license-apache2.0-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/iflytek/astron-agent?style=social)](https://github.com/iflytek/astron-agent/stargazers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/iflytek/astron-agent)

English | [简体中文](docs/README-zh.md)

</div>

## 🔭 What is Astron Agent
Astron Agent is an **enterprise-grade, commercial-friendly** Agentic Workflow development platform that integrates AI workflow orchestration, model management, AI and MCP tool integration, RPA automation, and team collaboration features.
The platform supports **high-availability** deployment, enabling organizations to rapidly build **scalable, production-ready** intelligent agent applications and establish their AI foundation for the future.

### Why Choose Astron Agent?
- **Stable and Reliable**: Built on the same core technology as the iFLYTEK Astron Agent Platform, providing enterprise-grade reliability with a fully available high-availability version open source.
- **Cross-System Integration**: Natively integrates intelligent RPA, efficiently connecting internal and external enterprise systems, enabling seamless interaction between Agents and enterprise systems.
- **Enterprise-Grade Open Ecosystem**: Deeply compatible with various industry models and tools, supporting custom extensions and flexibly adapting to diverse enterprise scenarios.
- **Business-Friendly**: Released under the Apache 2.0 License, with no commercial restrictions, allowing free commercial use.

### Key Features
- **Enterprise-Grade High Availability:** Full-stack capabilities for development, building, optimization, and management. Supports one-click deployment with strong reliability.  
- **Intelligent RPA Integration:** Enables cross-system process automation, empowering Agents with controllable execution to achieve a complete loop “from decision to action.”  
- **Ready-to-Use Tool Ecosystem:** Integrates massive AI capabilities and tools from the [iFLYTEK Open Platform](https://www.xfyun.cn), validated by millions of developers, supporting plug-and-play integration without extra development.  
- **Flexible Large Model Support:** Offers diverse access methods, from rapid API-based model access and validation to one-click deployment of enterprise-level MaaS (Model as a Service) on-premises clusters, meeting needs of all scales.  

## 📰 News

- **[Astron Hackathon @ 2025 iFLYTEK Global 1024 Developer Festival](https://luma.com/9zmbc6xb)**  🎤 <a href="https://github.com/mklong"><img src="https://github.com/mklong.png" width="20" align="center" /> @mklong</a>
- **[Astron Agent Zhengzhou Meetup](https://github.com/iflytek/astron-agent/discussions/672)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a> <a href="https://github.com/wowo-zZ"><img src="https://github.com/wowo-zZ.png" width="20" align="center" /> @wowo-zZ</a>
- **[Astron on Campus @ Zhejiang University of Finance and Economics](https://mp.weixin.qq.com/s/oim_Z0ckgpFwf5jOskoJuA)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>
- **[Astron Agent & RPA · Qingdao Meetup Brings Agentic AI!](https://github.com/iflytek/astron-agent/discussions/740)**  🎤 <a href="https://github.com/vsxd"><img src="https://github.com/vsxd.png" width="20" align="center" /> @vsxd</a> <a href="https://github.com/doctorbruce"><img src="https://github.com/doctorbruce.png" width="20" align="center" /> @doctorbruce</a> <a href="https://github.com/MaxwellJean"><img src="https://github.com/MaxwellJean.png" width="20" align="center" /> @MaxwellJean</a>
- **[Astron Training Camp · Cohort #1](https://www.aidaxue.com/astronCamp)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>
- **[Astron Talk @ Chongqing Mini Tech Fest](https://mp.weixin.qq.com/s/HROf1zZpkPVDSsCQrv2jRg)**  🎤 <a href="https://github.com/lyj715824"><img src="https://github.com/lyj715824.png" width="20" align="center" /> @lyj715824</a>

## 🚀 Quick Start

We offer two deployment methods to meet different scenarios:

### Option 1: Docker Compose (Recommended for Quick Start)

```bash
# Clone the repository
git clone https://github.com/iflytek/astron-agent.git

# Navigate to astronAgent directory
cd docker/astronAgent

# Copy environment configuration
cp .env.example .env

# Configure environment variables
vim .env
```

For environment variable configuration, please refer to the documentation:[DEPLOYMENT_GUIDE_WITH_AUTH.md](https://github.com/iflytek/astron-agent/blob/main/docs/DEPLOYMENT_GUIDE_WITH_AUTH.md#step-2-configure-astronagent-environment-variables)

```bash
# Start all services (including Casdoor)
docker compose -f docker-compose-with-auth.yaml up -d
```

#### 📊 Service Access Addresses

After startup, you can access the services at the following addresses:

**Authentication Service**
- **Casdoor Admin Interface**: http://localhost:8000

**AstronAgent**
- **Application Frontend (nginx proxy)**: http://localhost/

**Note**
- Default Casdoor login credentials: username: `admin`, password: `123`

### Option 2: Helm (For Kubernetes Environments)

> 🚧 **Note**: Helm charts are currently under development. Stay tuned for updates!

```bash
# Coming soon
# helm repo add astron-agent https://iflytek.github.io/astron-agent
# helm install astron-agent astron-agent/astron-agent
```

---

> 📖 For complete deployment instructions and configuration details, see [Deployment Guide](docs/DEPLOYMENT_GUIDE_WITH_AUTH.md)

## 📖 Using Astron Cloud

**Try Astron**：Astron Cloud provides a ready-to-use environment for creating and managing Agents.Free quick access [https://agent.xfyun.cn](https://agent.xfyun.cn).

**Using Guide**：For detailed usage instructions, please refer to [Quick Start Guide](https://www.xfyun.cn/doc/spark/Agent03-%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.html).

## 📚 Documentation

- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [🔧 Configuration](docs/CONFIGURATION.md)
- [🚀 Quick Start](https://www.xfyun.cn/doc/spark/Agent02-%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B.html)
- [📘 Development Guide](https://www.xfyun.cn/doc/spark/Agent03-%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.html#_1-%E6%8C%87%E4%BB%A4%E5%9E%8B%E6%99%BA%E8%83%BD%E4%BD%93%E5%BC%80%E5%8F%91)
- [💡 Best Practices](https://www.xfyun.cn/doc/spark/AgentNew-%E6%8A%80%E6%9C%AF%E5%AE%9E%E8%B7%B5%E6%A1%88%E4%BE%8B.html)
- [📱 Use Cases](https://www.xfyun.cn/doc/spark/Agent05-%E5%BA%94%E7%94%A8%E6%A1%88%E4%BE%8B.html)
- [❓ FAQ](https://www.xfyun.cn/doc/spark/Agent06-FAQ.html)

## 🤝 Contributing

We welcome contributions of all kinds! Please see our [Contributing Guide](CONTRIBUTING.md)

## 🌟 Star History

<div align="center">
  <img src="https://api.star-history.com/svg?repos=iflytek/astron-agent&type=Date" alt="Star History Chart" width="600">
</div>

## 📞 Support

- 💬 Community Discussion: [GitHub Discussions](https://github.com/iflytek/astron-agent/discussions)
- 🐛 Bug Reports: [Issues](https://github.com/iflytek/astron-agent/issues)
- 👥 WeChat Work Group:

<div align="center">
  <img src="./docs/imgs/WeCom_Group.png" alt="WeChat Work Group" width="300">
</div>

## 📄 Open Source License

This project is licensed under the [Apache 2.0 License](LICENSE), allowing free use, modification, distribution, and commercial use without any restrictions.

