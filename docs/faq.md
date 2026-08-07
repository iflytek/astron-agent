# FAQ

This page answers the most common questions users run into when they first open the documentation site or start deployment work.

## What Powers The GitHub Pages Site

The Pages site no longer publishes the legacy `website/` directory directly. It now builds the VitePress docs site under `docs/` and publishes the generated static output.

## Why Was The Site Moved To VitePress

- Documentation can be maintained by directory instead of one large HTML file
- Homepage, guides, configuration, and FAQ can evolve independently
- GitHub Pages and Vercel only need to publish static build artifacts
- Navigation, search, and future sections are easier to extend

## Do I Need To Change GitHub Pages Settings

Yes. The repository Pages settings should use `GitHub Actions` as the deployment source so the workflow can build and upload the docs output directory.

## How Do I Preview The Docs Locally

Run the following inside `docs/`:

```bash
npm install
npm run docs:dev
```

## Where Should I Go For Deeper Troubleshooting

- [Repository FAQ](https://github.com/iflytek/astron-agent/blob/main/FAQ.md)
- [GitHub Discussions](https://github.com/iflytek/astron-agent/discussions)
- [GitHub Issues](https://github.com/iflytek/astron-agent/issues)
