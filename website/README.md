# Astron Agent Site

本目录是历史保留的静态站点源码。

当前线上文档站 `https://iflytek.github.io/astron-agent/` 已切换为基于 `docs/` 目录的 VitePress 构建产物发布。

## 目录说明

- `index.html`：官网首页
- `styles.css`：样式文件
- `script.js`：轻量交互脚本
- `assets/`：站点图片与 Logo

## GitHub Pages

仓库通过 `.github/workflows/deploy-pages.yml` 发布文档站：

- 当 `main` 或 `master` 分支下的 `docs/` 内容更新时自动发布
- 构建命令在 `docs/` 目录执行 `npm run docs:build`
- 发布目录为 `docs/.vitepress/dist`
- 构建时注入 `DOCS_BASE=/astron-agent/`，用于适配 GitHub Pages 项目路径

首次使用时还需要在 GitHub 仓库设置中确认：

1. 打开 `Settings -> Pages`
2. 确认 `Build and deployment` 使用 `GitHub Actions`

## Vercel

仓库根目录已新增 `vercel.json`，同样以 `docs/.vitepress/dist` 作为静态输出目录。

Vercel 中建议这样配置：

1. Import 当前 GitHub 仓库
2. Framework Preset 选择 `Other`
3. 保持 Root Directory 为仓库根目录
4. 直接部署，Vercel 会读取 `vercel.json`

## 本地预览

当前推荐预览方式是在 `docs/` 目录执行：

```bash
npm install
npm run docs:dev
```

然后访问 VitePress 输出的本地地址。
