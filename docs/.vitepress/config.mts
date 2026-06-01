import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE || "/";

export default defineConfig({
  title: "Astron Agent",
  description: "企业级、商业友好的 Agentic Workflow 开发平台文档站。",
  lang: "zh-CN",
  base,
  cleanUrls: true,
  ignoreDeadLinks: true,
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Astron Agent",
    nav: [
      { text: "首页", link: "/" },
      { text: "快速开始", link: "/guide/quick-start" },
      { text: "部署与运维", link: "/guide/deploy" },
      { text: "架构与开发", link: "/PROJECT_MODULES_zh" },
      { text: "贡献协作", link: "/CONTRIBUTING_CN" }
    ],
    sidebar: [
      {
        text: "入门指南",
        items: [
          { text: "快速开始", link: "/guide/quick-start" },
          { text: "部署指南", link: "/guide/deploy" },
          { text: "配置说明", link: "/guide/config" },
          { text: "FAQ", link: "/faq" },
          { text: "README（中文）", link: "/README-zh" }
        ]
      },
      {
        text: "部署与运维",
        items: [
          { text: "标准部署指南", link: "/DEPLOYMENT_GUIDE_zh" },
          { text: "鉴权部署指南", link: "/DEPLOYMENT_GUIDE_WITH_AUTH_zh" },
          { text: "鉴权 + RPA 部署指南", link: "/DEPLOYMENT_GUIDE_WITH_AUTH_RPA_zh" },
          { text: "部署常见问题", link: "/DEPLOYMENT_FAQ_zh" },
          { text: "配置文档", link: "/CONFIGURATION_zh" }
        ]
      },
      {
        text: "架构与开发",
        items: [
          { text: "模块说明", link: "/PROJECT_MODULES_zh" },
          { text: "Makefile 使用指南", link: "/Makefile-readme-zh" }
        ]
      },
      {
        text: "贡献协作",
        items: [
          { text: "贡献指南", link: "/CONTRIBUTING_CN" },
          { text: "Pre-commit 使用指南", link: "/PRE-COMMIT_zh" }
        ]
      }
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/iflytek/astron-agent" }
    ],
    search: {
      provider: "local"
    },
    footer: {
      message: "Apache 2.0 Licensed.",
      copyright: "Copyright © iFLYTEK Astron Agent"
    }
  }
});
