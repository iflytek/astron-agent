import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import AstronCasesPage from "./AstronCasesPage.vue";
import ExamplesGallery from "./ExamplesGallery.vue";
import Layout from "./Layout.vue";
import "./custom.css";

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("AstronCasesPage", AstronCasesPage);
    app.component("ExamplesGallery", ExamplesGallery);
  }
};

export default theme;
