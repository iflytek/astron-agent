<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

import chinatelecomLogo from "../../cases/imgs/chinatelecom.png";
import donghuaLogo from "../../cases/imgs/donghua.png";
import fiberhomeLogo from "../../cases/imgs/fiberhome.png";
import foxitLogo from "../../cases/imgs/foxit.jpg";
import guangwuLogo from "../../cases/imgs/guangwu.jpg";
import shandongYunguLogo from "../../cases/imgs/shandongyungu.png";
import xiangyangDongshengLogo from "../../cases/imgs/xiangyang-dongsheng.png";
import xiaoquLogo from "../../cases/imgs/xiaoqu.png";
import yugouLogo from "../../cases/imgs/yugou.jpg";
import yunsuanLogo from "../../cases/imgs/yunsuan.jpg";

type CaseCard = {
  logo: string;
  logoAlt: string;
  company: string;
  subtitle: string;
  tags: string[];
  scenario: string;
  delivery: string;
  outcome: string;
};

type CasesContent = {
  eyebrow: string;
  title: string;
  lead: string;
  heroTags: string[];
  stats: Array<{ value: string; label: string }>;
  pillarsEyebrow: string;
  pillarsTitle: string;
  pillarsText: string;
  pillars: Array<{ title: string; description: string }>;
  galleryEyebrow: string;
  galleryTitle: string;
  galleryText: string;
  labelScenario: string;
  labelDelivery: string;
  labelOutcome: string;
  cards: CaseCard[];
};

const { lang } = useData();

const zhContent: CasesContent = {
  eyebrow: "Customer Stories",
  title: "用户案例",
  lead:
    "Astron Agent 已在金融、电信、制造、园区运营等真实企业场景中落地，覆盖从智能分析、工作流编排到 RPA 执行的完整链路。",
  heroTags: ["Agent + RPA", "私有化与内网", "知识库与客服", "数据清洗与自动化"],
  stats: [
    { value: "10+", label: "企业案例" },
    { value: "4 类", label: "核心落地方向" },
    { value: "多行业", label: "覆盖金融、电信、制造、园区等场景" }
  ],
  pillarsEyebrow: "Delivery Patterns",
  pillarsTitle: "典型落地方向",
  pillarsText: "围绕企业落地最常见的四类需求，Astron Agent 提供从理解、决策到执行的完整能力。",
  pillars: [
    {
      title: "智能分析与决策",
      description: "面向非结构化数据清洗、市场分析和企业知识问答，让信息处理从人工整理转向智能提炼。"
    },
    {
      title: "Agent + RPA 协同执行",
      description: "覆盖业务受理、订单处理、业务稽核、邮件和 Excel 自动化，让智能体真正完成执行闭环。"
    },
    {
      title: "私有化与内网适配",
      description: "适配金融、电信、制造和涉密网络环境，兼顾高安全要求、复杂网络和存量系统集成。"
    },
    {
      title: "二次开发与共建",
      description: "支持围绕 SSO、企微集成、插件扩展和 Skill 演进持续建设企业自己的智能体能力。"
    }
  ],
  galleryEyebrow: "Case Gallery",
  galleryTitle: "企业案例一览",
  galleryText: "",
  labelScenario: "业务场景",
  labelDelivery: "落地方式",
  labelOutcome: "应用成果",
  cards: [
    {
      logo: donghuaLogo,
      logoAlt: "东华软件 logo",
      company: "东华软件",
      subtitle: "金融行业方案验证",
      tags: ["金融", "数据处理", "Agent + RPA"],
      scenario: "银行征信数据归集、反洗钱报告生成，探索面向金融行业的智能体与自动化能力。",
      delivery: "补齐认证、容器部署、模型授权和 RPA 架构配置，串起可验证的业务闭环。",
      outcome: "较快完成金融核心场景验证，为后续 OEM 与行业复制打下基础。"
    },
    {
      logo: chinatelecomLogo,
      logoAlt: "中国电信 logo",
      company: "中国电信苏州分公司",
      subtitle: "内网业务受理与稽核",
      tags: ["电信", "内网部署", "业务稽核"],
      scenario: "自动业务受理、业务稽核，全部运行在企业内网环境。",
      delivery: "围绕验证码识别、复杂页面定位和内网依赖注入，形成隔离网络下的实施方案。",
      outcome: "推动核心流程进入灰度试运行，跑通高安全场景下的业务闭环。"
    },
    {
      logo: yunsuanLogo,
      logoAlt: "云算数字科技 logo",
      company: "云算数字科技",
      subtitle: "智慧园区客服与数据分析",
      tags: ["园区运营", "数据清洗", "生产上线"],
      scenario: "智慧园区客服、竞品与热点分析、非结构化订单数据清洗。",
      delivery: "利用大模型和 Prompt 将复杂文本转成结构化 JSON，并通过工作流写回业务系统。",
      outcome: "实现市场洞察自动化、客户服务智能化和数据录入闭环。"
    },
    {
      logo: xiaoquLogo,
      logoAlt: "小趣科技 logo",
      company: "小趣科技",
      subtitle: "开发环境与二次开发调试",
      tags: ["研发支持", "前后端分离", "开源版"],
      scenario: "RPA 二次开发调试、前后端分离开发部署。",
      delivery: "明确开源版支持前后端分离开发模式，帮助团队以更灵活的方式调试源码。",
      outcome: "消除部署不确定性，加快环境搭建和二次开发启动速度。"
    },
    {
      logo: shandongYunguLogo,
      logoAlt: "山东云谷 logo",
      company: "山东云谷",
      subtitle: "财务自动化与 OCR 扩展",
      tags: ["软件服务", "财务自动化", "OCR 扩展"],
      scenario: "财务系统自动化、自动化测试、验证码与 OCR 扩展。",
      delivery: "排查环境冲突带来的拾取异常，提供第三方 OCR 接入路径和流程配置建议。",
      outcome: "完成业务环境下的可行性验证，为核心流程后续上线建立基础。"
    },
    {
      logo: guangwuLogo,
      logoAlt: "广物互联 logo",
      company: "广物互联",
      subtitle: "企微集成与规划型 Agent 探索",
      tags: ["企业服务", "SSO", "规划能力"],
      scenario: "企业微信集成、单点登录、具备规划能力的智能体应用探索。",
      delivery: "快速定位多组织登录问题，明确企微扫码登录、SSO 和规划能力的推进路径。",
      outcome: "保证基础环境可用，帮助客户尽快明确后续集成与共建方向。"
    },
    {
      logo: yugouLogo,
      logoAlt: "北京榆构 logo",
      company: "北京榆构",
      subtitle: "企业知识库与数字人导览",
      tags: ["制造业", "知识库", "私有化"],
      scenario: "企业私有知识库、数字人导览、智能体应用与 RPA 联动。",
      delivery: "围绕容器稳定性、Nginx/HTTPS、Casdoor 登录和联合部署链路完成排障。",
      outcome: "在内网环境搭建起知识库和智能体底座，推动项目进入真实业务验证阶段。"
    },
    {
      logo: fiberhomeLogo,
      logoAlt: "烽火通信 logo",
      company: "烽火通信科技",
      subtitle: "离线环境自动化与系统联动",
      tags: ["通信", "离线内网", "Open API"],
      scenario: "离线内网 RPA 自动化、界面录制回放、内网 AI 模型接入、与 Jenkins 等系统联动。",
      delivery: "打通离线镜像导入、模拟人工输入、动态元素定位、自定义 AI 模型和 Open API 对接。",
      outcome: "验证 Astron 在高安全隔离环境中的部署可行性，并为后续系统扩展留出接口。"
    },
    {
      logo: foxitLogo,
      logoAlt: "厦门福昕中数 logo",
      company: "厦门福昕中数",
      subtitle: "数智员工与工作流编排",
      tags: ["软件产品", "工作流", "共建反馈"],
      scenario: "数智员工智能体、插件集成、工作流编排与 RPA 私有化部署。",
      delivery: "通过代码节点绕过接口限制，支持现有后端系统联调，并围绕 Skill 与任务拆分持续共建。",
      outcome: "保障关键接口联调推进，同时沉淀多项可复用的产品反馈和共建成果。"
    },
    {
      logo: xiangyangDongshengLogo,
      logoAlt: "襄阳东昇 logo",
      company: "襄阳东昇",
      subtitle: "订单接收与办公自动化",
      tags: ["制造配套", "邮件自动化", "Excel 自动化"],
      scenario: "订单自动接收、邮件附件自动下载处理、共享文件夹 Excel 自动化。",
      delivery: "针对邮件组件、Excel 实例调度、路径转义和网页组件问题提供源码级修复与实施指导。",
      outcome: "打通订单接收关键链路，提升无人值守运行稳定性，持续替代重复性办公工作。"
    }
  ]
};

const enContent: CasesContent = {
  eyebrow: "Customer Stories",
  title: "Case Studies",
  lead:
    "Astron Agent has been delivered in real enterprise scenarios across finance, telecom, manufacturing, and smart campus operations, covering the full path from intelligent analysis to workflow execution.",
  heroTags: ["Agent + RPA", "Private Deployment", "Knowledge + Support", "Data Structuring"],
  stats: [
    { value: "10+", label: "Customer stories" },
    { value: "4 Types", label: "Core delivery patterns" },
    { value: "Multi-Industry", label: "Finance, telecom, manufacturing, campus services and more" }
  ],
  pillarsEyebrow: "Delivery Patterns",
  pillarsTitle: "Where Astron Lands",
  pillarsText: "Astron Agent typically creates value in four repeatable delivery patterns across enterprise projects.",
  pillars: [
    {
      title: "Intelligent Analysis",
      description: "Turn unstructured text, market signals, and enterprise knowledge into structured insights with less manual effort."
    },
    {
      title: "Agent + RPA Execution",
      description: "Connect understanding, decision making, and execution across business acceptance, order handling, audits, email, and Excel workflows."
    },
    {
      title: "Private And Intranet Deployment",
      description: "Support highly controlled environments with strict security constraints, complex networking, and existing enterprise systems."
    },
    {
      title: "Customization And Co-Building",
      description: "Extend the platform around SSO, WeCom integration, plugins, and Skill evolution based on real business requirements."
    }
  ],
  galleryEyebrow: "Case Gallery",
  galleryTitle: "Customer Gallery",
  galleryText: "",
  labelScenario: "Scenario",
  labelDelivery: "Delivery",
  labelOutcome: "Outcome",
  cards: [
    {
      logo: donghuaLogo,
      logoAlt: "Donghua Software logo",
      company: "Donghua Software",
      subtitle: "Financial workflow validation",
      tags: ["Finance", "Data Processing", "Agent + RPA"],
      scenario: "Credit data aggregation and anti-money-laundering report generation for banking workflows.",
      delivery: "Completed authentication, container deployment, model authorization, and RPA architecture setup to validate an end-to-end solution.",
      outcome: "Accelerated solution verification for financial scenarios and prepared the ground for OEM and industry replication."
    },
    {
      logo: chinatelecomLogo,
      logoAlt: "China Telecom logo",
      company: "China Telecom Suzhou",
      subtitle: "Intranet acceptance and audit",
      tags: ["Telecom", "Intranet", "Business Audit"],
      scenario: "Automatic service acceptance and business auditing in a fully isolated enterprise network.",
      delivery: "Built an intranet-ready automation path around captcha recognition, dynamic element targeting, and dependency injection.",
      outcome: "Moved core workflows into gray release and proved a secure closed loop for acceptance and auditing."
    },
    {
      logo: yunsuanLogo,
      logoAlt: "Yunsuan Digital Technology logo",
      company: "Yunsuan Digital Technology",
      subtitle: "Smart campus service and analytics",
      tags: ["Campus Service", "Data Structuring", "Production"],
      scenario: "Smart campus customer support, competitor and trend analysis, and unstructured order text transformation.",
      delivery: "Used LLM plus prompt design to convert raw business text into structured JSON and write it back through workflows.",
      outcome: "Enabled automated market insight, smarter service operations, and a closed-loop data entry process."
    },
    {
      logo: xiaoquLogo,
      logoAlt: "Xiaoqu Technology logo",
      company: "Xiaoqu Technology",
      subtitle: "Developer environment and debugging",
      tags: ["Developer Experience", "Separated Frontend", "Open Source"],
      scenario: "RPA secondary development, source debugging, and frontend-backend separated deployment.",
      delivery: "Confirmed support for separated development mode so the team could iterate and debug faster.",
      outcome: "Removed deployment uncertainty and accelerated environment setup for custom development."
    },
    {
      logo: shandongYunguLogo,
      logoAlt: "Shandong Yungu logo",
      company: "Shandong Yungu",
      subtitle: "Finance automation and OCR extension",
      tags: ["Software Service", "Finance Automation", "OCR"],
      scenario: "Finance system automation, automated testing, and captcha/OCR capability extension.",
      delivery: "Resolved environment conflicts affecting element capture and provided a clear path for third-party OCR integration.",
      outcome: "Validated technical feasibility in the customer environment and prepared the way for production rollout."
    },
    {
      logo: guangwuLogo,
      logoAlt: "Guangwu Interconnect logo",
      company: "Guangwu Interconnect",
      subtitle: "WeCom and planning-oriented agents",
      tags: ["Enterprise Service", "SSO", "Planning"],
      scenario: "WeCom integration, SSO, and planning-capable agent exploration.",
      delivery: "Quickly located multi-organization login issues and clarified the implementation path for WeCom and planning features.",
      outcome: "Kept the evaluation environment usable and helped the team align on the next integration steps."
    },
    {
      logo: yugouLogo,
      logoAlt: "Beijing Yugou logo",
      company: "Beijing Yugou",
      subtitle: "Knowledge base and digital guide",
      tags: ["Manufacturing", "Knowledge Base", "Private Deployment"],
      scenario: "Private enterprise knowledge base, digital human guide, and Agent + RPA integration.",
      delivery: "Solved container stability, Nginx/HTTPS, Casdoor login, and joint deployment issues.",
      outcome: "Built a private knowledge and agent foundation and moved the project into real business validation."
    },
    {
      logo: fiberhomeLogo,
      logoAlt: "FiberHome logo",
      company: "FiberHome",
      subtitle: "Offline automation and system orchestration",
      tags: ["Telecom", "Offline Intranet", "Open API"],
      scenario: "Offline RPA automation, recording and playback, private AI model access, and Jenkins integration.",
      delivery: "Completed the path for offline images, simulated typing, dynamic element targeting, custom AI access, and Open API integration.",
      outcome: "Verified deployment feasibility in a highly secure environment and left clear extension points for future system integration."
    },
    {
      logo: foxitLogo,
      logoAlt: "Foxit Zhongshu logo",
      company: "Foxit Zhongshu",
      subtitle: "Digital workforce and workflow orchestration",
      tags: ["Software Product", "Workflow", "Co-Building"],
      scenario: "Digital employee agents, plugin integration, workflow orchestration, and private RPA deployment.",
      delivery: "Used code nodes to work around payload restrictions and kept the existing backend integration moving forward.",
      outcome: "Protected delivery progress while generating reusable product feedback and co-building value."
    },
    {
      logo: xiangyangDongshengLogo,
      logoAlt: "Xiangyang Dongsheng logo",
      company: "Xiangyang Dongsheng",
      subtitle: "Order intake and office automation",
      tags: ["Manufacturing Supply", "Email Automation", "Excel Automation"],
      scenario: "Automatic order intake, email attachment download, and shared-folder Excel processing.",
      delivery: "Provided source-level fixes and implementation guidance for email components, Excel instance control, and path handling.",
      outcome: "Opened the key automation path for order intake and improved unattended operational stability."
    }
  ]
};

const content = computed(() => (lang.value === "en-US" ? enContent : zhContent));

const pad = (n: number) => String(n).padStart(2, "0");
</script>

<template>
  <div class="cases-page">
    <section class="cases-page__hero">
      <div class="cases-page__hero-grid" aria-hidden="true"></div>
      <div class="cases-page__hero-inner">
        <div class="cases-page__hero-copy">
          <span class="cases-page__eyebrow cases-page__eyebrow--hero">{{ content.eyebrow }}</span>
          <h1>{{ content.title }}</h1>
          <p>{{ content.lead }}</p>
          <div class="cases-page__hero-tags">
            <span v-for="tag in content.heroTags" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="cases-page__stats">
          <article v-for="stat in content.stats" :key="stat.label" class="cases-page__stat-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="cases-page__section">
      <div class="cases-page__heading">
        <span class="cases-page__eyebrow">{{ content.pillarsEyebrow }}</span>
        <h2>{{ content.pillarsTitle }}</h2>
        <p>{{ content.pillarsText }}</p>
      </div>
      <div class="cases-page__pillars">
        <article
          v-for="(pillar, idx) in content.pillars"
          :key="pillar.title"
          class="pillar-card"
        >
          <span class="pillar-card__index">{{ pad(idx + 1) }}</span>
          <h3>{{ pillar.title }}</h3>
          <p>{{ pillar.description }}</p>
        </article>
      </div>
    </section>

    <section class="cases-page__section">
      <div class="cases-page__heading">
        <span class="cases-page__eyebrow">{{ content.galleryEyebrow }}</span>
        <h2>{{ content.galleryTitle }}</h2>
        <p v-if="content.galleryText">{{ content.galleryText }}</p>
      </div>
      <div class="cases-page__grid">
        <article v-for="card in content.cards" :key="card.company" class="case-card">
          <header class="case-card__header">
            <div class="case-card__logo-wrap">
              <img :src="card.logo" :alt="card.logoAlt">
            </div>
            <div class="case-card__brand-copy">
              <h3>{{ card.company }}</h3>
              <p>{{ card.subtitle }}</p>
              <div class="case-card__tags">
                <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </header>

          <dl class="case-card__details">
            <div class="case-card__detail">
              <dt>{{ content.labelScenario }}</dt>
              <dd>{{ card.scenario }}</dd>
            </div>
            <div class="case-card__detail">
              <dt>{{ content.labelDelivery }}</dt>
              <dd>{{ card.delivery }}</dd>
            </div>
            <div class="case-card__detail">
              <dt>{{ content.labelOutcome }}</dt>
              <dd>{{ card.outcome }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cases-page {
  display: flex;
  flex-direction: column;
  gap: 56px;
  padding-bottom: 24px;
}

/* ---------- Hero ---------- */

.cases-page__hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  color: #f7fbff;
  background:
    radial-gradient(circle at 85% -10%, rgba(102, 240, 207, 0.22), transparent 42%),
    radial-gradient(circle at 0% 0%, rgba(93, 168, 255, 0.28), transparent 38%),
    linear-gradient(135deg, #0a1c33 0%, #0f2a4a 50%, #081628 100%);
  box-shadow: 0 32px 80px rgba(7, 18, 36, 0.22);
}

.cases-page__hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at 50% 35%, #000 35%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 35%, #000 35%, transparent 75%);
  pointer-events: none;
}

.cases-page__hero-inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
  gap: 28px;
  padding: 44px 40px;
}

.cases-page__hero-copy h1 {
  margin: 18px 0 0;
  font-size: clamp(36px, 4.4vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.035em;
}

.cases-page__hero-copy p {
  margin: 18px 0 0;
  max-width: 680px;
  font-size: 16px;
  line-height: 1.7;
  color: #cfdcef;
}

.cases-page__hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.cases-page__hero-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #eaf1fb;
  font-size: 12.5px;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cases-page__eyebrow {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(54, 95, 145, 0.22);
  background: rgba(93, 168, 255, 0.08);
  color: #2f6dbf;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cases-page__eyebrow--hero {
  border-color: rgba(122, 240, 212, 0.32);
  background: rgba(122, 240, 212, 0.08);
  color: #7af0d4;
}

.cases-page__stats {
  display: grid;
  gap: 12px;
  align-content: end;
}

.cases-page__stat-card {
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
}

.cases-page__stat-card strong {
  display: block;
  color: #ffffff;
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.cases-page__stat-card span {
  display: block;
  margin-top: 8px;
  color: #cfdcef;
  font-size: 13.5px;
  line-height: 1.55;
}

/* ---------- Section heading ---------- */

.cases-page__section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cases-page__heading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cases-page__heading h2 {
  margin: 4px 0 0;
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.15;
  letter-spacing: -0.025em;
  color: var(--vp-c-text-1);
}

.cases-page__heading p {
  margin: 0;
  max-width: 720px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

/* ---------- Pillars ---------- */

.cases-page__pillars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.pillar-card {
  position: relative;
  padding: 24px 24px 22px;
  border-radius: 20px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.pillar-card:hover {
  transform: translateY(-2px);
  border-color: rgba(93, 168, 255, 0.45);
  box-shadow: 0 18px 36px rgba(14, 29, 48, 0.08);
}

.pillar-card__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 22px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #5da8ff 0%, #2f7dff 100%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.pillar-card h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.pillar-card p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

/* ---------- Case grid ---------- */

.cases-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.case-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 26px 28px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.case-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  border-radius: 22px 22px 0 0;
  background: linear-gradient(90deg, #5da8ff 0%, #66f0cf 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.case-card:hover {
  transform: translateY(-3px);
  border-color: rgba(93, 168, 255, 0.45);
  box-shadow: 0 22px 44px rgba(14, 29, 48, 0.1);
}

.case-card:hover::before {
  opacity: 1;
}

.case-card__header {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider-light, var(--vp-c-divider));
}

.case-card__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  padding: 10px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(20, 35, 58, 0.08);
}

.case-card__logo-wrap img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.case-card__brand-copy h3 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.005em;
}

.case-card__brand-copy p {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13.5px;
  line-height: 1.5;
}

.case-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.case-card__tags span {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 6px;
  background: rgba(93, 168, 255, 0.1);
  color: #2656a6;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.case-card__details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}

.case-card__detail {
  position: relative;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  padding-left: 12px;
  border-left: 2px solid rgba(93, 168, 255, 0.22);
}

.case-card__detail dt {
  margin: 0;
  padding-top: 2px;
  color: var(--vp-c-text-1);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.case-card__detail dd {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

/* ---------- Dark mode tuning ---------- */

:global(.dark) .cases-page__eyebrow {
  border-color: rgba(122, 169, 240, 0.28);
  background: rgba(93, 168, 255, 0.1);
  color: #9fc6ff;
}

:global(.dark) .case-card__tags span {
  background: rgba(93, 168, 255, 0.16);
  color: #a7c6f3;
}

:global(.dark) .case-card__logo-wrap {
  background: #f4f8ff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

:global(.dark) .case-card__detail {
  border-left-color: rgba(122, 169, 240, 0.3);
}

/* ---------- Responsive ---------- */

@media (max-width: 1000px) {
  .cases-page__hero-inner {
    grid-template-columns: 1fr;
    padding: 36px 32px;
  }

  .cases-page__pillars {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .cases-page {
    gap: 44px;
  }

  .cases-page__hero {
    border-radius: 22px;
  }

  .cases-page__hero-inner {
    padding: 30px 22px;
    gap: 24px;
  }

  .case-card {
    padding: 22px 20px;
    border-radius: 18px;
    gap: 18px;
  }

  .case-card__header {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 14px;
    padding-bottom: 16px;
  }

  .case-card__logo-wrap {
    width: 56px;
    height: 56px;
    padding: 8px;
    border-radius: 12px;
  }

  .case-card__brand-copy h3 {
    font-size: 17px;
  }

  .case-card__detail {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
