<script setup lang="ts">
import { computed, ref } from "vue";
import { useData } from "vitepress";
import { data as examples } from "../examples.data";

const REPO = "https://github.com/iflytek/astron-agent";
const { lang } = useData();
const isZh = computed(() => lang.value === "zh-CN");

const t = computed(() =>
  isZh.value
    ? {
        all: "全部",
        empty: "还没有示例，欢迎成为第一个贡献者。",
        by: "作者",
        source: "查看源码",
        download: "下载 workflow.yml",
        contribute: "贡献你的工作流",
        count: (n: number) => `${n} 个示例`
      }
    : {
        all: "All",
        empty: "No examples yet — be the first to contribute one.",
        by: "by",
        source: "View source",
        download: "Download workflow.yml",
        contribute: "Contribute your workflow",
        count: (n: number) => `${n} example${n === 1 ? "" : "s"}`
      }
);

const categories = computed(() => [...new Set(examples.map((e) => e.category))].sort());
const active = ref<string>("all");
const filtered = computed(() => (active.value === "all" ? examples : examples.filter((e) => e.category === active.value)));

const contributeHref = computed(() => (isZh.value ? "/zh/contribute-to-docs" : "/contribute-to-docs"));
</script>

<template>
  <div class="exg">
    <div class="exg__bar">
      <div class="exg__filters">
        <button class="exg__chip" :class="{ 'exg__chip--on': active === 'all' }" @click="active = 'all'">
          {{ t.all }} ({{ examples.length }})
        </button>
        <button
          v-for="c in categories"
          :key="c"
          class="exg__chip"
          :class="{ 'exg__chip--on': active === c }"
          @click="active = c"
        >
          {{ c }} ({{ examples.filter((e) => e.category === c).length }})
        </button>
      </div>
      <a class="exg__contribute" :href="REPO + '/tree/main/examples'" target="_blank" rel="noreferrer">
        + {{ t.contribute }}
      </a>
    </div>

    <p v-if="!examples.length" class="exg__empty">{{ t.empty }}</p>

    <div v-else class="exg__grid">
      <article v-for="e in filtered" :key="e.id" class="exg__card">
        <div class="exg__card-top">
          <span class="exg__cat">{{ e.category }}</span>
          <span v-if="e.event" class="exg__event">{{ e.event }}</span>
        </div>
        <h3 class="exg__title">{{ e.title }}</h3>
        <p class="exg__desc">{{ e.description }}</p>
        <ul v-if="e.features.length" class="exg__features">
          <li v-for="(f, i) in e.features.slice(0, 4)" :key="i">{{ f }}</li>
        </ul>
        <div class="exg__meta">
          <span v-if="e.author">{{ t.by }} {{ e.author }}</span>
        </div>
        <div class="exg__links">
          <a :href="`${REPO}/tree/main/${e.repoPath}`" target="_blank" rel="noreferrer">{{ t.source }}</a>
          <a :href="`${REPO}/raw/main/${e.repoPath}/workflow.yml`" target="_blank" rel="noreferrer">{{ t.download }}</a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.exg__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 24px;
}
.exg__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.exg__chip {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.exg__chip:hover {
  color: var(--vp-c-text-1);
}
.exg__chip--on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}
.exg__contribute {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.exg__empty {
  color: var(--vp-c-text-2);
  padding: 32px 0;
  text-align: center;
}
.exg__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.exg__card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 18px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.2s, transform 0.2s;
}
.exg__card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}
.exg__card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.exg__cat {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.exg__event {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.exg__title {
  margin: 0 0 6px;
  font-size: 17px;
  line-height: 1.3;
}
.exg__desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.exg__features {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.exg__features li {
  margin: 2px 0;
}
.exg__meta {
  margin-top: auto;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.exg__links {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
  font-weight: 500;
}
</style>
