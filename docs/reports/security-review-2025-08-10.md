# セキュリティレビュー（2025-08-10）

## 概要
本レポートは、csv_horizon_beta リポジトリ（Laravel 10 + Next.js）の現行実装に対するセキュリティレビュー結果です。バックエンド/フロントエンド双方のコードを確認し、重大度別に指摘と推奨対策をまとめました。

- 対象範囲: `backend/`（API ルート・コントローラ・設定・ミドルウェア・モデル・テスト）、`frontend/`（API 呼び出し・UI 実装・設定）、リポジトリルート設定
- 主な懸念点: 秘密情報のコミット、個人情報(PII)の無認証公開、XSS リスクとトークン保護、RBAC 欠如

## 総合スコア
- 52/100

### 減点内訳（要約）
- 秘密情報のコミット: -16（`.env` 露出、`APP_KEY`/DB/Redis、`APP_DEBUG=true`）
- PII の無認証公開: -14（`/api/users`, `/api/users/{user}`, `/api/users/export`）
- XSS + トークン保護不十分: -8（未サニタイズの `dangerouslySetInnerHTML` と `localStorage` トークン）
- RBAC 欠如: -6（誰でもインポート/バルク削除/バルクエクスポート可能）
- デバッグ有効化: -2（本番想定時のリスク）
- ログインスロットル弱: -1
- CSV でメタデータ改変余地: -1

---

## 重大（Critical）
1) 秘密情報がリポジトリにコミット
- 症状: ルート `.env` と `backend/.env` が追跡下。`APP_KEY`、DB 認証、Redis、`APP_DEBUG=true` が露出。
- 影響: 環境の完全な乗っ取り、暗号化/署名破り、横展開。
- 根拠: `/.env`, `backend/.env`, `backend/.gitignore`（`.env` がコメントアウト）
- 対策:
  - 直ちにキー・資格情報をローテーション。
  - `.gitignore` に `.env` を追加し、履歴から除去（filter-repo 等）。
  - 本番環境は `APP_DEBUG=false` 厳守。

2) 個人情報(PII)の無認証公開
- 症状: 以下が公開状態
  - `GET /api/users`（一覧）: ユーザーの詳細情報を返却
  - `GET /api/users/{user}`（詳細）
  - `GET /api/users/export`（CSV で全件出力）
- 影響: 氏名/メール/住所/電話など PII の漏えい、ID 連番列挙
- 根拠: `backend/routes/api.php`, `PaginationController::index`, `UserController::show`, `CsvController::export`
- 対策:
  - これらを認証必須に変更、もしくは公開するなら匿名化・最小化された集計 API のみ提供。
  - 公開時は返却フィールドを厳格ホワイトリスト化。

---

## 高（High）
1) XSS リスク（CSV プレビュー + トークン窃取）
- 症状: `dangerouslySetInnerHTML` を CSV 由来データに対して使用し、検索ハイライトを挿入。サニタイズなし。
- 影響: XSS 経由で `localStorage` のトークンが奪取され、アカウント乗っ取りに直結。
- 根拠: `frontend/src/app/users/import/page.tsx`（約 751, 778 行付近）、`frontend/src/lib/api/auth.ts`（トークンを localStorage 保存）
- 対策:
  - `dangerouslySetInnerHTML` 廃止。文字列分割＋React ノードで安全にハイライト。
  - 認証は httpOnly/Secure クッキーへ移行（Sanctum SPA モード等）。
  - 併せて CSP/セキュリティヘッダーを導入。

2) RBAC 欠如
- 症状: 認証済みであれば誰でも「インポート」「バルク削除」「バルクエクスポート」が可能。
- 影響: 権限のない大量更新/削除/流出が可能。
- 根拠: `backend/routes/api.php`, `UserController::bulkDelete`, `CsvController::{import,bulkExport}`
- 対策:
  - Gate/Policy 等で管理者ロールのみ許可。ルートに `can:...` を適用。

---

## 中（Medium）
- デバッグ有効化（本番想定の危険）
  - 根拠: `backend/.env` の `APP_DEBUG=true`
  - 対策: 本番は `APP_DEBUG=false`。エラー詳細はログのみに出力。
- ログインスロットルの明確化不足
  - 対策: `/api/login` に個別スロットル（例 `throttle:5,1`）。
- ID 列挙（PII 公開の一部として）
  - `GET /api/users/{user}` が公開。列挙により PII 収集が容易。

## 低（Low）/ 注意点
- CSV インポートでメタデータ投入
  - `created_at/updated_at/membership_status` 等が投入可能。RBAC 必須前提で管理者のみ許可すべき。
- CORS 設定
  - `supports_credentials: true`。本番で `FRONTEND_URL` を厳密に。
- 機能差分（セキュリティ影響は小）
  - フロントとバックエンドのエンドポイントは `/users/bulk-export` に統一された。

---

## 推奨対策（優先度順チェックリスト）
1) シークレット/設定の是正（直ちに実施）
- `.env` を追跡から除外（`.gitignore` 修正）。漏えいした全てのキー/資格を即時ローテーション。
- 本番 `APP_DEBUG=false` に固定。

2) アクセス制御（公開範囲の見直し）
- `GET /api/users`、`/api/users/{user}`、`/api/users/export` を認証必須に変更。
- 公開が必要な場合は「匿名化された集計 API」のみ提供、返却フィールド最小化。

3) XSS/トークン保護
- `dangerouslySetInnerHTML` を廃止、サニタイズ/ノード分割でハイライト描画。
- 認証は httpOnly/Secure クッキーへ移行。最小でも厳格 CSP を導入（`script-src` nonce/strict-dynamic）。
- Next.js でセキュリティヘッダー（CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy 等）を追加。

4) レート制限/堅牢化
- `/api/login` に厳格スロットル。エクスポートのパラメータはホワイトリスト化。
- 一覧/詳細 API は返却フィールド最小化（住所/電話は業務要件時のみ）。

5) モニタリング/運用
- バルク系操作（インポート/削除/エクスポート）の監査ログ強化。
- アラート（大量削除/大量エクスポートの検出）。

---

## 良い点（ポジティブ）
- 認証のタイミング攻撃対策（ダミーハッシュ）実装は適切（`AuthController::login`）。
- ユーザー作成/更新のバリデーションは堅牢（強パスワード/URL 検証/メール重複）。
- CSV エクスポートは高速かつ適切にエスケープされ、メモリ効率を考慮。
- キャッシュタグを用いたクリアは設計意図が明確で良好。

---

## 参考（主な確認ファイル）
- ルート/コントローラ: `backend/routes/api.php`, `App/Http/Controllers/*`
- 設定: `backend/config/cors.php`, `backend/config/auth.php`, `backend/.env`
- ミドルウェア: `App/Http/Middleware/CompressResponse.php`, `App/Http/Kernel.php`
- モデル: `App/Models/User.php`
- フロント: `frontend/src/lib/api/*`, `frontend/src/app/users/import/page.tsx`, `frontend/next.config.js`

---

## 次のアクション（提案）
- ドキュメント整備: `.gitignore` 修正方針と秘密情報のローテーション手順を `docs/SECURITY.md` に追記。
- 実装パッチ（希望があれば対応可能）:
  - `.gitignore` 追記と `.env` 除外
  - 公開エンドポイントの認証化 + ポリシー導入（管理者ロール）
  - フロントの XSS リスク除去（安全なハイライト描画）
  - Next.js セキュリティヘッダー + 簡易 CSP の追加

