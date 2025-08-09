# Issue #44: RBAC導入（管理者のみ：インポート/バルク削除/エクスポート）

## 概要
現在、認証済みであれば誰でも以下の操作が可能です：
- CSVインポート `POST /api/users/import`
- バルク削除 `POST /api/users/bulk-delete`
- バルクエクスポート `POST /api/users/bulk-export`

本Issueでは、これらをロールベースアクセス制御（RBAC）で「管理者限定」に変更します。

## 目的/効果
- 権限のない大量更新/削除/情報流出の防止
- 最小特権の原則の徹底

## 影響範囲
- `backend/routes/api.php`
- `App/Policies/*`（新規）
- `App/Models/User`（ロール属性の追加が必要な場合）
- DBマイグレーション（roles/permissions 付与）
- フロントの権限に応じたUI切り替え

## 具体的な対応
1. データモデル
   - `users`に`role`カラム（例: user/admin）を追加、もしくは専用テーブルを設計
2. ポリシー/ゲート
   - `can:import-users`, `can:bulk-delete-users`, `can:export-users` を定義
   - ルートに `middleware('can:...')` を適用
3. UI
   - 非管理者のUIから当該機能を非表示

## 受け入れ基準
- 非管理者が当該APIにアクセスすると403
- 管理者は従来通り操作可能
- ロール変更が反映される（テスト含む）

## 参考
- セキュリティレビュー（2025-08-10）: docs/reports/security-review-2025-08-10.md
