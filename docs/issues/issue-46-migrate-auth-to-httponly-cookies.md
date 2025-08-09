# Issue #46: 認証トークンをhttpOnlyクッキーへ移行（Sanctum SPA）

## 概要
フロントエンドがアクセストークンを `localStorage` に保存しており、XSS時のトークン窃取リスクが高い。SanctumのSPAモードを用い、httpOnly/Secureクッキーに移行する。

## 目的/効果
- XSS経由のトークン抽出を防止
- セッションクッキー運用へ移行（CSRF対策含む）

## 影響範囲
- `frontend/src/lib/api/auth.ts`（トークン保管/送信ロジック）
- Laravel Sanctum設定（`EnsureFrontendRequestsAreStateful` 有効化・CORS/CSRF設定）
- `.env` のフロント/バック間ドメイン設定

## 具体的な対応
1. Sanctum SPA構成
   - `EnsureFrontendRequestsAreStateful`ミドルウェアの有効化
   - CORSにフロントオリジンを明示
   - CSRFクッキーの取得フロー（`/sanctum/csrf-cookie`）
2. フロントの認証
   - `localStorage` 利用を廃止
   - 認証/ログアウトはクッキー前提でエンドポイント呼び出し
3. セキュリティ
   - クッキーは`Secure`/`SameSite`適切化

## 受け入れ基準
- ブラウザから`document.cookie`でトークンが取得できない
- ログイン/ログアウト/認証APIがクッキーで正常動作
- CSRF保護が成立

## 参考
- セキュリティレビュー（2025-08-10）: docs/reports/security-review-2025-08-10.md
