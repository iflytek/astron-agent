# 为文档站做贡献

本文档站基于 [VitePress](https://vitepress.dev/) 构建，源码位于主仓库的
[`docs/`](https://github.com/iflytek/astron-agent/tree/main/docs) 目录。改进文档——修正错别字、厘清步骤、补充示例、翻译页面——是最容易完成的一次贡献。

## 一键编辑

每个页面底部都有 **「在 GitHub 上编辑此页」** 链接。点击即可直接在 GitHub 编辑器中打开源文件，改完提交 Pull Request，无需任何本地环境。

## 本地运行

改动较大时，建议在本地预览：

```bash
cd docs
npm install
npm run docs:dev      # 本地开发服务器，热更新
npm run docs:build    # 生产构建（CI 部署用的就是它）
```

## 目录结构（i18n）

本站采用 VitePress 标准 i18n 布局：**英文为根目录默认语言**，**简体中文以相同的相对路径镜像在 `zh/` 下**：

```
docs/
├── index.md              # 英文首页
├── guide/quick-start.md  # 英文
├── PROJECT_MODULES.md    # 英文
├── zh/
│   ├── index.md              # 中文首页
│   ├── guide/quick-start.md  # 中文
│   └── PROJECT_MODULES.md    # 中文
├── imgs/                 # 共享图片（两种语言共用）
└── .vitepress/config.mts # 两种语言的导航与侧边栏
```

约定：`docs/X.md`（英文）对应的中文页面是 `docs/zh/X.md`。两边路径保持一致，结构就不会再漂移。

## 新增或修改页面

1. 修改根目录的英文页面（如 `docs/guide/my-page.md`）。
2. 在 `zh/` 下相同相对路径同步中文（如 `docs/zh/guide/my-page.md`）。
3. 如果是**新增**页面，需在 [`docs/.vitepress/config.mts`](https://github.com/iflytek/astron-agent/blob/main/docs/.vitepress/config.mts) 中为**两种语言**的 `sidebar`（必要时含 `nav`）都登记。
4. 图片放在 `docs/imgs/`（根目录用 `./imgs/...`，`zh/` 下用 `../imgs/...`）。

> 只擅长一种语言？把你能写的那一份提交，并开一个 issue（或在 PR 里说明），让维护者或其他贡献者补另一种语言。不要让中英两棵树悄悄错位。

## 提交改动

```bash
git checkout -b docs/my-change
git commit -s -m "docs: 描述你的改动"   # -s 添加 DCO 签名（必需）
git push origin docs/my-change
```

随后向 `main` 发起 Pull Request。CI 会构建站点校验你的改动；合并后[线上站点](https://iflytek.github.io/astron-agent/)会自动部署。
