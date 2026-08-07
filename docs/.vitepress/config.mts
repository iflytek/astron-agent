import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE || "/";

const socialLinks = [
  { icon: "github", link: "https://github.com/iflytek/astron-agent" }
];

const editLinkPattern = "https://github.com/iflytek/astron-agent/edit/main/docs/:path";

export default defineConfig({
  title: "Astron Agent",
  description: "Documentation for the enterprise-grade, commercially-friendly Agentic Workflow platform.",
  base,
  cleanUrls: true,
  ignoreDeadLinks: true,
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      title: "Astron Agent",
      description: "Documentation for the enterprise-grade, commercially-friendly Agentic Workflow platform.",
      themeConfig: {
        logo: "/logo-square.png",
        siteTitle: "Astron Agent",
        nav: [
          { text: "Home", link: "/" },
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Deployment", link: "/guide/deploy" },
          { text: "Case Studies", link: "/cases/" },
          { text: "Examples", link: "/examples" },
          { text: "Architecture & Dev", link: "/PROJECT_MODULES" },
          { text: "Contributing", link: "/CONTRIBUTING" }
        ],
        sidebar: [
          {
            text: "Getting Started",
            items: [
              { text: "Project Overview", link: "/README" },
              { text: "Quick Start", link: "/guide/quick-start" },
              { text: "FAQ", link: "/faq" }
            ]
          },
          {
            text: "Case Studies",
            items: [
              { text: "Customer Stories", link: "/cases/" },
              { text: "Workflow Examples", link: "/examples" }
            ]
          },
          {
            text: "Deployment Guides",
            items: [
              { text: "Deployment Overview", link: "/guide/deploy" },
              { text: "Full Deployment Guide", link: "/DEPLOYMENT_GUIDE" },
              { text: "Auth Deployment Guide", link: "/DEPLOYMENT_GUIDE_WITH_AUTH" },
              { text: "Auth + RPA Deployment Guide", link: "/DEPLOYMENT_GUIDE_WITH_AUTH_RPA" },
              { text: "Deployment FAQ", link: "/DEPLOYMENT_FAQ" }
            ]
          },
          {
            text: "Configuration And Development",
            items: [
              { text: "Configuration Guide", link: "/guide/config" },
              { text: "Configuration Reference", link: "/CONFIGURATION" },
              { text: "Project Modules", link: "/PROJECT_MODULES" },
              { text: "Makefile Guide", link: "/Makefile-readme" }
            ]
          },
          {
            text: "Contribution",
            items: [
              { text: "Contributing Guide", link: "/CONTRIBUTING" },
              { text: "Contribute to the Docs", link: "/contribute-to-docs" },
              { text: "Pre-commit Guide", link: "/PRE-COMMIT" }
            ]
          }
        ],
        socialLinks,
        search: {
          provider: "local"
        },
        editLink: {
          pattern: editLinkPattern,
          text: "Edit this page on GitHub"
        },
        langMenuLabel: "Languages",
        returnToTopLabel: "Back to top",
        sidebarMenuLabel: "Menu",
        darkModeSwitchLabel: "Theme",
        outline: {
          label: "On this page"
        },
        docFooter: {
          prev: "Previous page",
          next: "Next page"
        },
        footer: {
          message: "Apache 2.0 Licensed.",
          copyright: "Copyright © iFLYTEK Astron Agent"
        }
      }
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      title: "Astron Agent",
      description: "企业级、商业友好的 Agentic Workflow 开发平台文档站。",
      themeConfig: {
        logo: "/logo-square.png",
        siteTitle: "Astron Agent",
        nav: [
          { text: "首页", link: "/zh/" },
          { text: "快速开始", link: "/zh/guide/quick-start" },
          { text: "部署与配置", link: "/zh/guide/deploy" },
          { text: "案例实践", link: "/zh/cases/" },
          { text: "工作流示例", link: "/zh/examples" },
          { text: "架构与开发", link: "/zh/PROJECT_MODULES" },
          { text: "贡献协作", link: "/zh/CONTRIBUTING" }
        ],
        sidebar: [
          {
            text: "开始使用",
            items: [
              { text: "项目概览", link: "/zh/README" },
              { text: "快速开始", link: "/zh/guide/quick-start" },
              { text: "FAQ", link: "/zh/faq" }
            ]
          },
          {
            text: "案例实践",
            items: [
              { text: "用户案例", link: "/zh/cases/" },
              { text: "工作流示例", link: "/zh/examples" }
            ]
          },
          {
            text: "部署指南",
            items: [
              { text: "部署总览", link: "/zh/guide/deploy" },
              { text: "标准部署指南", link: "/zh/DEPLOYMENT_GUIDE" },
              { text: "鉴权部署指南", link: "/zh/DEPLOYMENT_GUIDE_WITH_AUTH" },
              { text: "鉴权 + RPA 部署指南", link: "/zh/DEPLOYMENT_GUIDE_WITH_AUTH_RPA" },
              { text: "部署 FAQ", link: "/zh/DEPLOYMENT_FAQ" }
            ]
          },
          {
            text: "配置与开发",
            items: [
              { text: "配置说明", link: "/zh/guide/config" },
              { text: "配置参考", link: "/zh/CONFIGURATION" },
              { text: "模块说明", link: "/zh/PROJECT_MODULES" },
              { text: "Makefile 使用指南", link: "/zh/Makefile-readme" }
            ]
          },
          {
            text: "贡献协作",
            items: [
              { text: "贡献指南", link: "/zh/CONTRIBUTING" },
              { text: "为文档站做贡献", link: "/zh/contribute-to-docs" },
              { text: "Pre-commit 使用指南", link: "/zh/PRE-COMMIT" }
            ]
          }
        ],
        socialLinks,
        search: {
          provider: "local"
        },
        editLink: {
          pattern: editLinkPattern,
          text: "在 GitHub 上编辑此页"
        },
        langMenuLabel: "语言",
        returnToTopLabel: "返回顶部",
        sidebarMenuLabel: "菜单",
        darkModeSwitchLabel: "主题",
        outline: {
          label: "页面导航"
        },
        docFooter: {
          prev: "上一页",
          next: "下一页"
        },
        footer: {
          message: "Apache 2.0 Licensed.",
          copyright: "Copyright © iFLYTEK Astron Agent"
        }
      }
    },
    ja: {
      label: "日本語",
      lang: "ja-JP",
      link: "/ja/README",
      title: "Astron Agent",
      description: "エンタープライズ向け・商用フレンドリーな Agentic Workflow 開発プラットフォームのドキュメントサイト。",
      themeConfig: {
        logo: "/logo-square.png",
        siteTitle: "Astron Agent",
        nav: [
          { text: "ホーム", link: "/ja/README" },
          { text: "プロジェクト概要", link: "/ja/README" }
        ],
        sidebar: [
          {
            text: "はじめに",
            items: [
              { text: "プロジェクト概要", link: "/ja/README" }
            ]
          }
        ],
        socialLinks,
        search: {
          provider: "local"
        },
        editLink: {
          pattern: editLinkPattern,
          text: "GitHub でこのページを編集"
        },
        langMenuLabel: "言語",
        returnToTopLabel: "ページトップに戻る",
        sidebarMenuLabel: "メニュー",
        darkModeSwitchLabel: "テーマ",
        outline: {
          label: "ページ内ナビゲーション"
        },
        docFooter: {
          prev: "前のページ",
          next: "次のページ"
        },
        footer: {
          message: "Apache 2.0 Licensed.",
          copyright: "Copyright © iFLYTEK Astron Agent"
        }
      }
    }
  }
});
