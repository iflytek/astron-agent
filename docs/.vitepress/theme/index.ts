import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import "./custom.css";

const theme: Theme = {
  extends: DefaultTheme,
  Layout
};

export default theme;
