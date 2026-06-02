# growi-plugin-wiki-ai-chat

GROWI 画面に **AI チャットウィジェット**を埋め込む script プラグイン。
これは「フロントのガワ」だけを担い、頭脳 (Gemini) はバックエンド `agent/server.py` にある。

## 権限スコープ（この設計の核心）

検索とページ本文取得は **ログイン中ユーザーのセッション cookie** で GROWI API を叩く
（`access_token` を付けない）。そのため取得結果は **そのユーザーの閲覧権限に自動一致**し、
見えないページの内容が回答に混ざらない（memory: `project_ai_wiki_agent`）。

```
[ユーザーのブラウザ / GROWI ログイン済]
  ① toSearchQuery(question)  ──▶ バックエンド /search-query (Gemini でキーワード抽出)
  ② /_api/search + /_api/v3/page  ◀── ユーザーのセッションで検索・本文取得（権限スコープ）
  ③ chat(question, passages) ──▶ バックエンド /chat (Gemini が回答)
```

- ブラウザは **Gemini API キーを持たない**（鍵はサーバ側のみ）。
- バックエンドは **GROWI 読み取りトークンを持たない**（本文はユーザー権限内のものだけ届く）。

### 検証済みの安全性（2026-06-02・本番/非admin で確認）

| 操作 | 非 admin での結果 |
| --- | --- |
| 制限ページ本文 `/_api/v3/page` | **403 page-is-forbidden**（本文は取得不可） |
| 検索 `/_api/search` のスニペット | 制限ページは **snippet: null**（本文断片を返さない） |
| 検索のパス/タイトル | 制限ページも露出（= GROWI 標準挙動） |

→ **本文（中身）は漏れない。** `fetchPassage()` が非 200（403 等）を `null` で捨てるため、
制限ページは passages にも sources にも出ず、Gemini にも届かない。

> ⚠️ 安全性の依存条件（壊さないこと）:
> 1. 本文は必ず `/_api/v3/page` 経由で取得し、**非 200 は捨てる**（`fetchPassage` の挙動）。
> 2. **検索のスニペット/ハイライトを本文として使わない**（制限ページの snippet は null だが、
>    将来 GROWI 設定変更で snippet が入る可能性に備え、本文ソースは page API に一本化する）。

## ビルド

```bash
cd plugin
npm install      # または pnpm install
npm run build    # dist/ に出力
```

## インストール（GROWI）

1. このディレクトリを Git リポジトリとして公開（または GROWI が読める場所に配置）
2. GROWI 管理画面 →「プラグイン」→ リポジトリ URL を追加して有効化
3. バックエンド `agent/server.py` を起動しておく

## バックエンド URL の指定

既定は `http://localhost:8008`。本番では GROWI と同一ドメインに
リバースプロキシして `/agent` に載せ、`window.__WIKI_AI_BACKEND__` で上書きする
（CORS 不要・運用が楽）。

## 未実装 / 次の改善

- ドキュメント添付（ブラウザからのファイルアップロード → バックエンドで Gemini files.upload）
- 会話履歴の保持（現状は単発 Q&A）
- 編集モード（差分提示 → 承認 → 書き込み）
