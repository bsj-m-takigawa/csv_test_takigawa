# Issue #47: Next.jsのセキュリティヘッダーとCSP追加

## 概要
Next.js側でCSPや主要セキュリティヘッダーが未設定。XSS/クリックジャッキング/情報露出の抑止を目的にヘッダーを追加する。

## ヘッダー例
- `Content-Security-Policy`（nonce/strict-dynamic採用、必要な外部送信先のみ許可）
- `X-Frame-Options: DENY`（または`frame-ancestors 'none'`）
- `Referrer-Policy: no-referrer`（業務要件に合わせ選択）
- `Permissions-Policy`（不要なAPIの無効化）
- `X-Content-Type-Options: nosniff`

## 影響範囲
- `frontend/next.config.js`（`headers()`追加）
- 画像/フォント/CDN利用時のCSP調整

## 受け入れ基準
- 本番ビルドでヘッダーが付与される
- 正当な機能がCSPでブロックされない（検証済み）

## 参考
- セキュリティレビュー（2025-08-10）: docs/reports/security-review-2025-08-10.md
