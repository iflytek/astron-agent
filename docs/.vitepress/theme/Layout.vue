<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import AstronHomePage from "./AstronHomePage.vue";

const { frontmatter } = useData();
</script>

<template>
  <AstronHomePage v-if="frontmatter.layout === 'astron-home'" />
  <DefaultTheme.Layout v-else />
</template>
