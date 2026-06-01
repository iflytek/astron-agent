<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useData, withBase } from "vitepress";

import archImage from "../../imgs/arch.png";
import heroPreviewImage from "../../imgs/Astron_Readme.png";
import structureEnImage from "../../imgs/structure.png";
import structureZhImage from "../../imgs/structure-zh.png";
import wecomGroupImage from "../../imgs/WeCom_Group.png";

const revealSelector = ".js-reveal";
let observer: IntersectionObserver | null = null;

const { lang } = useData();

const zhContent = {
  nav: {
    quickStart: "快速开始",
    deploy: "部署指南",
    config: "配置说明",
    faq: "FAQ",
    github: "GitHub"
  },
  eyebrow: "Open Source · Apache 2.0 · Enterprise Ready",
  heroTitleTop: "构建面向企业落地的",
  heroTitleBottom: "Agentic Workflow 平台",
  heroText:
    "Astron Agent 聚合 AI 工作流编排、模型管理、MCP 与工具集成、RPA 自动化以及多团队协作能力，帮助企业以更低成本快速构建高可用、可扩展、可运营的智能体应用。",
  primaryAction: "查看源码",
  secondaryAction: "体验 Astron Cloud",
  metrics: [
    {
      title: "企业级高可用",
      description: "支持面向生产环境的部署与运维"
    },
    {
      title: "MCP + RPA",
      description: "实现从决策到动作的执行闭环"
    },
    {
      title: "多语言微服务",
      description: "覆盖前端、Java、Python、Go 核心能力"
    }
  ],
  featureEyebrow: "Why Astron Agent",
  featureTitle: "围绕企业生产场景设计",
  featureText: "面向高可靠部署、跨系统连接与业务落地，提供从平台底座到业务编排的完整能力。",
  featureCards: [
    {
      title: "企业级高可用",
      description: "覆盖开发、构建、配置、部署与治理流程，适用于企业内外网及复杂运行环境。"
    },
    {
      title: "灵活模型接入",
      description: "支持从 API 快速验证到企业级 MaaS 与私有化模型集群部署的多种接入方式。"
    },
    {
      title: "工具与 MCP 生态",
      description: "兼容多类 AI 能力与工具调用模式，帮助 Agent 高效调用外部能力与业务系统。"
    },
    {
      title: "原生 RPA 融合",
      description: "让 Agent 不止能分析和决策，还能跨系统执行流程，实现自动化闭环。"
    },
    {
      title: "商业友好开源",
      description: "采用 Apache 2.0 协议发布，可自由修改、分发和商用，便于企业长期演进。"
    },
    {
      title: "多模块协同架构",
      description: "控制台、核心服务、知识、记忆、租户、插件与部署配置解耦，便于扩展和维护。"
    }
  ],
  architectureEyebrow: "Architecture",
  architectureTitle: "统一控制台 + 核心服务集群",
  architectureText:
    "前端、控制台后端、Agent / Workflow / Knowledge / Memory / Tenant 等服务职责清晰，适合多团队协作开发。",
  architectureCards: [
    {
      title: "总体架构",
      description: "控制台前后端、核心执行引擎与插件系统协同工作，形成端到端的智能体平台能力。",
      image: archImage,
      alt: "Astron Agent architecture diagram"
    },
    {
      title: "模块结构",
      description: "仓库涵盖 React + TypeScript、Java Spring Boot、Python FastAPI 与 Go 服务，支持模块化演进。",
      image: structureZhImage,
      alt: "Astron Agent structure diagram"
    }
  ],
  quickStartEyebrow: "Quick Start",
  quickStartTitle: "文档化接入路径",
  quickStartText: "首页保留品牌视觉，落地使用说明则进入文档页维护，便于后续持续扩展。",
  quickStartCards: {
    firstTitle: "1. 阅读快速开始",
    firstText: "先完成本地体验，再按需要切换到生产部署和配置章节。",
    firstCode: "docs/guide/quick-start.md\ndocs/guide/deploy.md\ndocs/guide/config.md",
    secondTitle: "2. 进入文档目录",
    secondText: "文档站支持侧边栏导航、全文搜索和静态构建，适合持续补充内容。",
    primaryAction: "开始阅读",
    secondaryAction: "查看 FAQ"
  },
  resourcesEyebrow: "Resources",
  resourcesTitle: "文档、社区与部署入口",
  resourcesText: "从首页进入稳定的信息架构，把说明文档和社区入口统一收敛到 Pages 文档站。",
  resourceCards: [
    {
      title: "快速开始",
      description: "两步完成本地体验，先拉起 Docker Compose 环境再进入控制台。",
      href: "/guide/quick-start"
    },
    {
      title: "部署指南",
      description: "查看 Docker、Helm 与环境变量准备方式，按场景选择部署路径。",
      href: "/guide/deploy"
    },
    {
      title: "配置说明",
      description: "了解基础设施、模型、存储与鉴权相关配置项，降低上线前排障成本。",
      href: "/guide/config"
    },
    {
      title: "FAQ",
      description: "收敛常见问题、定位思路和下一步排查入口，减少重复沟通。",
      href: "/faq"
    }
  ],
  communityEyebrow: "Community",
  communityTitle: "加入社区，共建 Astron Agent",
  communityText: "欢迎通过 GitHub Issues、Discussions 与企业微信群参与反馈、共建与协作。",
  communityPrimaryAction: "提交 Issue",
  communitySecondaryAction: "参与讨论",
  communityImageAlt: "Astron Agent community group",
  footerText: "企业级、商业友好的 Agentic Workflow 开发平台。",
  footerDocsLink: "文档入口"
};

const enContent = {
  nav: {
    quickStart: "Quick Start",
    deploy: "Deployment",
    config: "Configuration",
    faq: "FAQ",
    github: "GitHub"
  },
  eyebrow: "Open Source · Apache 2.0 · Enterprise Ready",
  heroTitleTop: "Build An Enterprise-Ready",
  heroTitleBottom: "Agentic Workflow Platform",
  heroText:
    "Astron Agent brings together AI workflow orchestration, model management, MCP and tool integrations, RPA automation, and team collaboration to help enterprises build reliable, scalable agent applications faster.",
  primaryAction: "View Source",
  secondaryAction: "Try Astron Cloud",
  metrics: [
    {
      title: "Production Ready",
      description: "Supports deployment and operations for real production environments"
    },
    {
      title: "MCP + RPA",
      description: "Closes the loop from decision making to real execution"
    },
    {
      title: "Polyglot Services",
      description: "Covers core capabilities across frontend, Java, Python, and Go"
    }
  ],
  featureEyebrow: "Why Astron Agent",
  featureTitle: "Designed For Real Enterprise Workloads",
  featureText:
    "Built for reliable deployment, cross-system integration, and practical delivery, from platform foundations to business workflow orchestration.",
  featureCards: [
    {
      title: "Enterprise Reliability",
      description: "Covers development, build, configuration, deployment, and governance for complex enterprise environments."
    },
    {
      title: "Flexible Model Access",
      description: "Supports everything from rapid API validation to enterprise MaaS and private model cluster integration."
    },
    {
      title: "Tools And MCP Ecosystem",
      description: "Connects agents with external capabilities and business systems through diverse tool invocation patterns."
    },
    {
      title: "Native RPA Integration",
      description: "Lets agents analyze, decide, and execute workflows across systems to complete automation loops."
    },
    {
      title: "Commercial-Friendly Open Source",
      description: "Released under Apache 2.0 so teams can modify, distribute, and commercialize with confidence."
    },
    {
      title: "Modular Service Architecture",
      description: "Decouples console, core services, knowledge, memory, tenant, plugin, and deployment concerns for long-term evolution."
    }
  ],
  architectureEyebrow: "Architecture",
  architectureTitle: "Unified Console Plus Core Service Cluster",
  architectureText:
    "Frontend, console backend, and Agent / Workflow / Knowledge / Memory / Tenant services have clear boundaries for multi-team collaboration.",
  architectureCards: [
    {
      title: "Platform Architecture",
      description: "The console, execution engine, and plugin system work together to deliver an end-to-end agent platform.",
      image: archImage,
      alt: "Astron Agent architecture diagram"
    },
    {
      title: "Repository Structure",
      description: "The monorepo combines React + TypeScript, Java Spring Boot, Python FastAPI, and Go services in a modular layout.",
      image: structureEnImage,
      alt: "Astron Agent repository structure diagram"
    }
  ],
  quickStartEyebrow: "Quick Start",
  quickStartTitle: "Documentation-First Onboarding",
  quickStartText:
    "The homepage keeps the product narrative concise, while operational details live in versioned documentation for continuous expansion.",
  quickStartCards: {
    firstTitle: "1. Start With The Guide",
    firstText: "Get a local environment running first, then move on to deployment and configuration details as needed.",
    firstCode: "docs/en/guide/quick-start.md\ndocs/en/guide/deploy.md\ndocs/en/guide/config.md",
    secondTitle: "2. Explore The Docs",
    secondText: "The docs site provides sidebar navigation, local search, and static builds that are easy to maintain over time.",
    primaryAction: "Read The Docs",
    secondaryAction: "Open FAQ"
  },
  resourcesEyebrow: "Resources",
  resourcesTitle: "Docs, Community, And Deployment Paths",
  resourcesText:
    "Move from the landing page into a stable information architecture that keeps documentation and community entry points in one place.",
  resourceCards: [
    {
      title: "Quick Start",
      description: "Get a local experience running in two steps before diving deeper into the platform.",
      href: "/guide/quick-start"
    },
    {
      title: "Deployment Guide",
      description: "Choose between Docker, Helm, and environment setup paths based on your scenario.",
      href: "/guide/deploy"
    },
    {
      title: "Configuration",
      description: "Review infrastructure, model, storage, and authentication settings before production rollout.",
      href: "/guide/config"
    },
    {
      title: "FAQ",
      description: "Find the main troubleshooting paths and reduce repeated onboarding questions.",
      href: "/faq"
    }
  ],
  communityEyebrow: "Community",
  communityTitle: "Join The Community",
  communityText: "Share feedback, implementation ideas, and collaboration requests through GitHub Issues, Discussions, and the WeCom group.",
  communityPrimaryAction: "Open An Issue",
  communitySecondaryAction: "Join Discussions",
  communityImageAlt: "Astron Agent community group",
  footerText: "An enterprise-grade, commercially-friendly Agentic Workflow development platform.",
  footerDocsLink: "Documentation"
};

const isEnglish = computed(() => lang.value === "en-US");
const content = computed(() => (isEnglish.value ? enContent : zhContent));

const localizePath = (path: string) => {
  const localePrefix = isEnglish.value ? "/en" : "";
  const normalizedPath = path === "/" ? "/" : path;
  return withBase(`${localePrefix}${normalizedPath}`);
};

onMounted(() => {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  cards.forEach((card) => observer?.observe(card));
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div class="astron-home">
    <header class="astron-home__hero">
      <nav class="astron-home__nav astron-container">
        <a class="astron-home__brand" :href="withBase('/')">
          <img :src="withBase('/logo.svg')" alt="Astron Agent logo">
          <span>Astron Agent</span>
        </a>
        <div class="astron-home__nav-links">
          <a :href="localizePath('/guide/quick-start')">{{ content.nav.quickStart }}</a>
          <a :href="localizePath('/guide/deploy')">{{ content.nav.deploy }}</a>
          <a :href="localizePath('/guide/config')">{{ content.nav.config }}</a>
          <a :href="localizePath('/faq')">FAQ</a>
          <a class="astron-home__nav-cta" href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">{{ content.nav.github }}</a>
        </div>
      </nav>

      <section class="astron-home__hero-main astron-container">
        <div class="astron-home__copy">
          <span class="astron-home__eyebrow">{{ content.eyebrow }}</span>
          <h1>
            <span>{{ content.heroTitleTop }}</span><br>
            <span>{{ content.heroTitleBottom }}</span>
          </h1>
          <p class="astron-home__text">
            {{ content.heroText }}
          </p>
          <div class="astron-home__actions">
            <a class="astron-home__button astron-home__button--primary" href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">{{ content.primaryAction }}</a>
            <a class="astron-home__button astron-home__button--secondary" href="https://agent.xfyun.cn" target="_blank" rel="noreferrer">{{ content.secondaryAction }}</a>
          </div>
          <ul class="astron-home__metrics">
            <li
              v-for="metric in content.metrics"
              :key="metric.title"
              class="js-reveal"
            >
              <strong>{{ metric.title }}</strong>
              <span>{{ metric.description }}</span>
            </li>
          </ul>
        </div>
        <div class="astron-home__visual js-reveal">
          <div class="astron-home__hero-card">
            <img :src="heroPreviewImage" alt="Astron Agent preview">
          </div>
        </div>
      </section>
    </header>

    <main>
      <section class="astron-home__section">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">{{ content.featureEyebrow }}</span>
            <h2>{{ content.featureTitle }}</h2>
            <p>{{ content.featureText }}</p>
          </div>
          <div class="astron-home__feature-grid">
            <article v-for="card in content.featureCards" :key="card.title" class="astron-home__panel js-reveal">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section astron-home__section--accent">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">{{ content.architectureEyebrow }}</span>
            <h2>{{ content.architectureTitle }}</h2>
            <p>{{ content.architectureText }}</p>
          </div>
          <div class="astron-home__architecture-grid">
            <article
              v-for="card in content.architectureCards"
              :key="card.title"
              class="astron-home__media-card js-reveal"
            >
              <img :src="card.image" :alt="card.alt">
              <div>
                <h3>{{ card.title }}</h3>
                <p>{{ card.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">{{ content.quickStartEyebrow }}</span>
            <h2>{{ content.quickStartTitle }}</h2>
            <p>{{ content.quickStartText }}</p>
          </div>
          <div class="astron-home__quickstart-grid">
            <article class="astron-home__code-card js-reveal">
              <h3>{{ content.quickStartCards.firstTitle }}</h3>
              <p>{{ content.quickStartCards.firstText }}</p>
              <pre><code>{{ content.quickStartCards.firstCode }}</code></pre>
            </article>
            <article class="astron-home__code-card js-reveal">
              <h3>{{ content.quickStartCards.secondTitle }}</h3>
              <p>{{ content.quickStartCards.secondText }}</p>
              <div class="astron-home__actions">
                <a class="astron-home__button astron-home__button--primary" :href="localizePath('/guide/quick-start')">{{ content.quickStartCards.primaryAction }}</a>
                <a class="astron-home__button astron-home__button--secondary" :href="localizePath('/faq')">{{ content.quickStartCards.secondaryAction }}</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section astron-home__section--accent">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">{{ content.resourcesEyebrow }}</span>
            <h2>{{ content.resourcesTitle }}</h2>
            <p>{{ content.resourcesText }}</p>
          </div>
          <div class="astron-home__resource-grid">
            <a
              v-for="resource in content.resourceCards"
              :key="resource.title"
              class="astron-home__panel astron-home__resource-card js-reveal"
              :href="localizePath(resource.href)"
            >
              <h3>{{ resource.title }}</h3>
              <p>{{ resource.description }}</p>
            </a>
          </div>
        </div>
      </section>

      <section class="astron-home__section">
        <div class="astron-container astron-home__community">
          <div class="astron-home__community-copy js-reveal">
            <span class="astron-home__eyebrow">{{ content.communityEyebrow }}</span>
            <h2>{{ content.communityTitle }}</h2>
            <p>{{ content.communityText }}</p>
            <div class="astron-home__actions">
              <a class="astron-home__button astron-home__button--primary" href="https://github.com/iflytek/astron-agent/issues" target="_blank" rel="noreferrer">{{ content.communityPrimaryAction }}</a>
              <a class="astron-home__button astron-home__button--secondary" href="https://github.com/iflytek/astron-agent/discussions" target="_blank" rel="noreferrer">{{ content.communitySecondaryAction }}</a>
            </div>
          </div>
          <div class="astron-home__community-card js-reveal">
            <img :src="wecomGroupImage" :alt="content.communityImageAlt">
          </div>
        </div>
      </section>
    </main>

    <footer class="astron-home__footer">
      <div class="astron-container astron-home__footer-inner">
        <div>
          <strong>Astron Agent</strong>
          <p>{{ content.footerText }}</p>
        </div>
        <div class="astron-home__footer-links">
          <a href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://agent.xfyun.cn" target="_blank" rel="noreferrer">Astron Cloud</a>
          <a :href="localizePath('/guide/quick-start')">{{ content.footerDocsLink }}</a>
        </div>
      </div>
    </footer>
  </div>
</template>
