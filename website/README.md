# Astron Agent Site

本目录是 `https://iflytek.github.io/astron-agent/` 对应的静态站点源码，同时可直接部署到 Vercel。

## 目录说明

- `index.html`：官网首页
- `styles.css`：样式文件
- `script.js`：轻量交互脚本
- `assets/`：站点图片与 Logo

## GitHub Pages

仓库已新增 `.github/workflows/deploy-pages.yml`：

- 当 `main` 或 `master` 分支下的 `website/` 内容更新时自动发布
- 发布目录为 `website/`

首次使用时还需要在 GitHub 仓库设置中确认：

1. 打开 `Settings -> Pages`
2. 确认 `Build and deployment` 使用 `GitHub Actions`

## Vercel

仓库根目录已新增 `vercel.json`，会在部署时把 `website/` 复制到 `dist/` 作为静态输出目录。

Vercel 中建议这样配置：

1. Import 当前 GitHub 仓库
2. Framework Preset 选择 `Other`
3. 保持 Root Directory 为仓库根目录
4. 直接部署，Vercel 会读取 `vercel.json`

## 本地预览

在仓库根目录执行：

```bash
python -m http.server 8080 --directory website
```

然后访问 `http://localhost:8080/`。
