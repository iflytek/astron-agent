# FAQ

本页作为文档站的常见问题入口，优先回答接入和部署阶段最容易遇到的问题。

## 现在的 Pages 站点是什么结构

当前站点已经从“直接发布 `website/` 静态目录”切换为“先构建文档站，再发布构建产物”。首页保留品牌视觉，具体内容通过 Markdown 文档持续维护。

## 为什么要改成文档站

- 文档可以按目录维护，而不是继续堆在单个 HTML 里
- 首页、指南、配置、FAQ 可以自然拆分
- GitHub Pages 和 Vercel 都只需要发布静态产物
- 后续补导航、搜索和更多章节的成本更低

## 需要改 GitHub Pages 设置吗

需要确认仓库的 `Settings -> Pages` 中使用 `GitHub Actions` 作为发布方式。工作流会自动构建并上传文档站产物目录。

## 本地怎么预览文档站

在 `docs/` 目录执行：

```bash
npm install
npm run docs:dev
```

## 完整问题排查去哪里看

- [仓库根目录 FAQ](https://github.com/iflytek/astron-agent/blob/main/FAQ.md)
- [GitHub Discussions](https://github.com/iflytek/astron-agent/discussions)
- [GitHub Issues](https://github.com/iflytek/astron-agent/issues)
