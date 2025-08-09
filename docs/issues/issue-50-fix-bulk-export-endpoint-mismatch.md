# Issue #50: bulk-exportエンドポイントの不一致修正

## 概要
フロントエンドは `POST /users/bulk-export-fast` を呼び出しているが、バックエンドは `POST /users/bulk-export` のみ実装されているため、機能不一致が発生する。

## 対応方針
いずれかで整合させる：
1. フロントを `POST /users/bulk-export` に合わせる（対応済み）
2. バックエンドに `/users/bulk-export-fast` のエイリアスルートを追加（不要）

## 影響範囲
- `frontend/src/lib/api/users.ts`
- `backend/routes/api.php`

## 受け入れ基準
- フロントからのバルクエクスポートが正常動作
- ルート/コードの重複が発生しない

## 参考
- セキュリティレビュー（2025-08-10）: docs/reports/security-review-2025-08-10.md

## ステータス
2025-08-09: フロントエンドを `/users/bulk-export` に統一し、本Issueは解決済み。
