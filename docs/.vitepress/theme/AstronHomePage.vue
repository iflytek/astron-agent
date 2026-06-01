<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { withBase } from "vitepress";

const revealSelector = ".js-reveal";
let observer: IntersectionObserver | null = null;

const featureCards = [
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
];

const resourceCards = [
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
];

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
          <a :href="withBase('/guide/quick-start')">快速开始</a>
          <a :href="withBase('/guide/deploy')">部署指南</a>
          <a :href="withBase('/guide/config')">配置说明</a>
          <a :href="withBase('/faq')">FAQ</a>
          <a class="astron-home__nav-cta" href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </nav>

      <section class="astron-home__hero-main astron-container">
        <div class="astron-home__copy">
          <span class="astron-home__eyebrow">Open Source · Apache 2.0 · Enterprise Ready</span>
          <h1>构建面向企业落地的<br>Agentic Workflow 平台</h1>
          <p class="astron-home__text">
            Astron Agent 聚合 AI 工作流编排、模型管理、MCP 与工具集成、RPA 自动化以及多团队协作能力，
            帮助企业以更低成本快速构建高可用、可扩展、可运营的智能体应用。
          </p>
          <div class="astron-home__actions">
            <a class="astron-home__button astron-home__button--primary" href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">查看源码</a>
            <a class="astron-home__button astron-home__button--secondary" href="https://agent.xfyun.cn" target="_blank" rel="noreferrer">体验 Astron Cloud</a>
          </div>
          <ul class="astron-home__metrics">
            <li class="js-reveal">
              <strong>企业级高可用</strong>
              <span>支持面向生产环境的部署与运维</span>
            </li>
            <li class="js-reveal">
              <strong>MCP + RPA</strong>
              <span>实现从决策到动作的执行闭环</span>
            </li>
            <li class="js-reveal">
              <strong>多语言微服务</strong>
              <span>覆盖前端、Java、Python、Go 核心能力</span>
            </li>
          </ul>
        </div>
        <div class="astron-home__visual js-reveal">
          <div class="astron-home__hero-card">
            <img :src="withBase('/imgs/Astron_Readme.png')" alt="Astron Agent preview">
          </div>
        </div>
      </section>
    </header>

    <main>
      <section class="astron-home__section">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">Why Astron Agent</span>
            <h2>围绕企业生产场景设计</h2>
            <p>面向高可靠部署、跨系统连接与业务落地，提供从平台底座到业务编排的完整能力。</p>
          </div>
          <div class="astron-home__feature-grid">
            <article v-for="card in featureCards" :key="card.title" class="astron-home__panel js-reveal">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section astron-home__section--accent">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">Architecture</span>
            <h2>统一控制台 + 核心服务集群</h2>
            <p>前端、控制台后端、Agent / Workflow / Knowledge / Memory / Tenant 等服务职责清晰，适合多团队协作开发。</p>
          </div>
          <div class="astron-home__architecture-grid">
            <article class="astron-home__media-card js-reveal">
              <img :src="withBase('/imgs/arch.png')" alt="Astron Agent architecture diagram">
              <div>
                <h3>总体架构</h3>
                <p>控制台前后端、核心执行引擎与插件系统协同工作，形成端到端的智能体平台能力。</p>
              </div>
            </article>
            <article class="astron-home__media-card js-reveal">
              <img :src="withBase('/imgs/structure-zh.png')" alt="Astron Agent structure diagram">
              <div>
                <h3>模块结构</h3>
                <p>仓库涵盖 React + TypeScript、Java Spring Boot、Python FastAPI 与 Go 服务，支持模块化演进。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">Quick Start</span>
            <h2>文档化接入路径</h2>
            <p>首页保留品牌视觉，落地使用说明则进入文档页维护，便于后续持续扩展。</p>
          </div>
          <div class="astron-home__quickstart-grid">
            <article class="astron-home__code-card js-reveal">
              <h3>1. 阅读快速开始</h3>
              <p>先完成本地体验，再按需要切换到生产部署和配置章节。</p>
              <pre><code>docs/guide/quick-start.md
docs/guide/deploy.md
docs/guide/config.md</code></pre>
            </article>
            <article class="astron-home__code-card js-reveal">
              <h3>2. 进入文档目录</h3>
              <p>文档站支持侧边栏导航、全文搜索和静态构建，适合持续补充内容。</p>
              <div class="astron-home__actions">
                <a class="astron-home__button astron-home__button--primary" :href="withBase('/guide/quick-start')">开始阅读</a>
                <a class="astron-home__button astron-home__button--secondary" :href="withBase('/faq')">查看 FAQ</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="astron-home__section astron-home__section--accent">
        <div class="astron-container">
          <div class="astron-home__section-heading js-reveal">
            <span class="astron-home__eyebrow">Resources</span>
            <h2>文档、社区与部署入口</h2>
            <p>从首页进入稳定的信息架构，把说明文档和社区入口统一收敛到 Pages 文档站。</p>
          </div>
          <div class="astron-home__resource-grid">
            <a
              v-for="resource in resourceCards"
              :key="resource.title"
              class="astron-home__panel astron-home__resource-card js-reveal"
              :href="withBase(resource.href)"
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
            <span class="astron-home__eyebrow">Community</span>
            <h2>加入社区，共建 Astron Agent</h2>
            <p>欢迎通过 GitHub Issues、Discussions 与企业微信群参与反馈、共建与协作。</p>
            <div class="astron-home__actions">
              <a class="astron-home__button astron-home__button--primary" href="https://github.com/iflytek/astron-agent/issues" target="_blank" rel="noreferrer">提交 Issue</a>
              <a class="astron-home__button astron-home__button--secondary" href="https://github.com/iflytek/astron-agent/discussions" target="_blank" rel="noreferrer">参与讨论</a>
            </div>
          </div>
          <div class="astron-home__community-card js-reveal">
            <img :src="withBase('/imgs/WeCom_Group.png')" alt="Astron Agent community group">
          </div>
        </div>
      </section>
    </main>

    <footer class="astron-home__footer">
      <div class="astron-container astron-home__footer-inner">
        <div>
          <strong>Astron Agent</strong>
          <p>企业级、商业友好的 Agentic Workflow 开发平台。</p>
        </div>
        <div class="astron-home__footer-links">
          <a href="https://github.com/iflytek/astron-agent" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://agent.xfyun.cn" target="_blank" rel="noreferrer">Astron Cloud</a>
          <a :href="withBase('/guide/quick-start')">文档入口</a>
        </div>
      </div>
    </footer>
  </div>
</template>
