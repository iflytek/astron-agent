# Astron Agent - Agent Development Platform

<div align="center">

![Logo](docs/logo.svg)

**Astron Agent is an enterprise-grade Agent development platform designed for AI developers and organizations of all types.**

[![License](https://img.shields.io/badge/license-apache2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/iflytek/astron-agent)](https://github.com/iflytek/astron-agent/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/iflytek/astron-agent/ci.yml)](https://github.com/iflytek/astron-agent/actions)
[![Coverage](https://img.shields.io/codecov/c/github/iflytek/astron-agent)](https://codecov.io/gh/iflytek/astron-agent)
[![GitHub Stars](https://img.shields.io/github/stars/iflytek/astron-agent?style=social)](https://github.com/iflytek/astron-agent/stargazers)

English | [简体中文](README-zh.md)

</div>

## 📑 Table of Contents

- [🔭 What is Astron Agent?](#-What-is-Astron-Agent)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [🚀 Quick Start](#-quick-start)
  - [Using Docker](#using-docker)
- [📖 Usage Guide](#-usage-guide)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [🌟 Star History](#-star-history)
- [📞 Support](#-support)
- [📄 License](#-license)

## 🔭 What is Astron Agent
Astron Agent is an enterprise-grade Agent development platform designed for AI developers and organizations of all types. 
It not only provides full-lifecycle capabilities covering model hosting, application development, performance optimization, and access control, but also innovatively integrates intelligent RPA. This allows Agents not only to “think,” but also to truly “act,” completing complex task chains across digital systems and desktop environments.

### Why Choose Astron Agent?
- **Unified Technology Base, Stable and Reliable:** Shares the same core technology with [iFLYTEK Astron Agent Platform](https://agent.xfyun.cn), inheriting its proven enterprise-grade stability.  
- **Closed Loop of Thinking + Acting:** Deep integration of intelligent RPA enables Agents to move from "generating answers" to "automatically completing tasks."  
- **Dual Value for Developers and Enterprises:** Developers can quickly get started and expand, while SMEs can efficiently implement digital workflows.  

### Key Features
- **Enterprise-Grade High Availability:** Full-stack capabilities for development, building, optimization, and management. Supports one-click deployment with strong reliability.  
- **Intelligent RPA Integration:** Enables cross-system process automation, empowering Agents with controllable execution to achieve a complete loop “from decision to action.”  
- **Ready-to-Use Tool Ecosystem:** Integrates massive AI capabilities and tools from the [iFLYTEK Open Platform](https://www.xfyun.cn), validated by millions of developers, supporting plug-and-play integration without extra development.  
- **Flexible Model Support:** Offers diverse access methods, from rapid API-based model access and validation to one-click deployment of enterprise-level MaaS (Model as a Service) on-premises clusters, meeting needs of all scales.  

### Developer Support
- **Multi-language Backend:** Supports mainstream languages such as Java, Go, and Python; frontend adapted to TypeScript + React stack.  
- **Comprehensive Toolchain:** Provides API documentation, deployment guides, and troubleshooting manuals to reduce learning and maintenance costs.  
- **One-Click Deployment:** Built-in Dockerized environment for out-of-the-box setup and rapid project launch.  

## 🛠️ Tech Stack

- **Backend**: Java 21, Spring Boot 3, Go, Python 3.11
- **Frontend**: TypeScript 5, React 18
- **Database**: MySQL 8
- **Cache**: Redis
- **Message Queue**: Apache Kafka
- **Infrastructure**: Docker, MinIO
- **Quality Tools**: Checkstyle, PMD, SpotBugs, ESLint, gocyclo, staticcheck, golangci-lint, black, isort, flake8, mypy, pylint

## Architecture Overview

![Architecture Overview](./docs/imgs/structure.png "Architecture Overview")

## 🚀 Quick Start

### Using Docker

```bash
# Clone the repository
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent

# Start the stack
docker-compose up -d
```

- Visit `http://localhost:8080` in your browser.

## 📖 Usage Guide

For detailed usage instructions, please refer to [Usage Documentation](docs/USAGE.md)

## 📚 Documentation

- [📖 Usage Documentation](docs/USAGE.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT.md)
- [📖 API Reference](docs/API.md)
- [🔧 Configuration](docs/CONFIGURATION.md)
- [🐛 Troubleshooting](docs/TROUBLESHOOTING.md)
- [📝 Changelog](CHANGELOG.md)

## 🤝 Contributing

We welcome contributions of all kinds! Please see our [Contributing Guide](CONTRIBUTING.md)

## 🌟 Star History

<div align="center">
  <img src="https://api.star-history.com/svg?repos=iflytek/astron-agent&type=Date" alt="Star History Chart" width="600">
</div>

## 📞 Support

- 💬 Community Discussion: [GitHub Discussions](https://github.com/iflytek/astron-agent/discussions)
- 🐛 Bug Reports: [Issues](https://github.com/iflytek/astron-agent/issues)

## 📄 Open Source License

This project is licensed under the [Apache 2.0 License](LICENSE).

---

<div align="center">

**Developed and maintained by iFLYTEK**

[![Follow](https://img.shields.io/github/followers/iflytek?style=social&label=Follow)](https://github.com/iflytek)
[![Star](https://img.shields.io/github/stars/iflytek/astron-agent?style=social&label=Star)](https://github.com/iflytek/astron-agent)
[![Fork](https://img.shields.io/github/forks/iflytek/astron-agent?style=social&label=Fork)](https://github.com/iflytek/astron-agent/fork)
[![Watch](https://img.shields.io/github/watchers/iflytek/astron-agent?style=social&label=Watch)](https://github.com/iflytek/astron-agent/watchers)

</div>
