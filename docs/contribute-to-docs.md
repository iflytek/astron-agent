# Contribute to the Docs

This documentation site is built with [VitePress](https://vitepress.dev/) and lives in the
[`docs/`](https://github.com/iflytek/astron-agent/tree/main/docs) directory of the main repository.
Improving the docs — fixing a typo, clarifying a step, adding an example, or translating a page — is
one of the easiest ways to make your first contribution.

## Quick edit (one click)

Every page has an **"Edit this page on GitHub"** link at the bottom. Click it to open the source file
directly in GitHub's editor, make your change, and submit a pull request — no local setup required.

## Run the site locally

For larger changes, preview the site on your machine:

```bash
cd docs
npm install
npm run docs:dev      # local dev server with hot reload
npm run docs:build    # production build (what CI deploys)
```

## Directory structure (i18n)

The site follows the standard VitePress i18n layout. **English is the default locale at the root**,
and **Simplified Chinese mirrors it under `zh/`** with identical relative paths:

```
docs/
├── index.md              # English home
├── guide/quick-start.md  # English
├── PROJECT_MODULES.md    # English
├── zh/
│   ├── index.md              # 中文首页
│   ├── guide/quick-start.md  # 中文
│   └── PROJECT_MODULES.md    # 中文
├── imgs/                 # shared images (referenced by both locales)
└── .vitepress/config.mts # nav & sidebar for both locales
```

Rule of thumb: a page at `docs/X.md` (English) has its Chinese counterpart at `docs/zh/X.md`. Keep the
two paths in sync so the structure never drifts.

## Add or change a page

1. Edit the English page at the root (e.g. `docs/guide/my-page.md`).
2. Mirror the change in Chinese at the same relative path under `zh/` (e.g. `docs/zh/guide/my-page.md`).
3. If you add a **new** page, register it in the `sidebar` (and `nav` if needed) for **both** locales in
   [`docs/.vitepress/config.mts`](https://github.com/iflytek/astron-agent/blob/main/docs/.vitepress/config.mts).
4. Reference images from `docs/imgs/` (use `./imgs/...` from the root, `../imgs/...` from `zh/`).

> Only comfortable in one language? Submit the page you can write and open an issue (or note it in your
> PR) so a maintainer or another contributor can add the other locale. Don't leave the trees mismatched
> silently.

## Submit your change

```bash
git checkout -b docs/my-change
git commit -s -m "docs: describe your change"   # -s adds the DCO sign-off (required)
git push origin docs/my-change
```

Then open a pull request against `main`. CI builds the site to validate your change; once merged, the
[live site](https://iflytek.github.io/astron-agent/) is deployed automatically.
