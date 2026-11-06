# クイックスタート

> 新規ユーザーは `/register` で登録し、既存ユーザーは UID を維持して管理者発行のリンクからパスワードを再設定します。

このページでは、初めて評価する方に向けた最短ルートをまとめています。まずはローカル環境で始め、必要に応じて完全なデプロイ・設定リファレンスへ進んでください。

## こんな方におすすめ

- まずローカルで全体の流れを試したい開発者
- ログイン可能なデモ環境をすばやく用意したいチーム
- 後から Docker Compose から Helm や本番設定へ移行する予定のユーザー

## 2 ステップで起動

### 1. リポジトリをクローン

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
```

既定の起動では `.env` のコピー・編集や環境変数の入力は不要です。モデルや外部サービスは起動後に必要に応じて設定してください。

### 2. サービスを起動

```bash
docker compose up -d --build
```

起動が完了すると、デフォルトのアクセス先は次のとおりです：

- Astron Agent フロントエンド：ローカルは `http://localhost/`、リモートは `http://<server-ip>/`（既定ポート 80）。サーバー IP でのアクセスにも環境変数の変更は不要です。

## 推奨の読み進め方

1. まず[デプロイ概要](/guide/deploy)を確認する
2. 続いて[設定の概要](/guide/config)に進む
3. 問題が発生した場合は [FAQ](/ja/faq) を参照する

## 詳細リファレンス

- [プロジェクト README](/ja/README)
- [認証付きデプロイガイド](/DEPLOYMENT_GUIDE_WITH_AUTH)
- [完全なデプロイガイド](/DEPLOYMENT_GUIDE)
