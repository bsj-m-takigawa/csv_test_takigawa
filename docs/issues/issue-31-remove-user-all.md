# Issue #31: User::all()の除去とページネーション強制

## 問題の概要
UserControllerのindexメソッドでUser::all()が使用されており、大量のデータがある場合にメモリ不足を引き起こす可能性があります。

## 重要な発見
- **実際のAPIエンドポイント（GET /api/users）はPaginationController::index()を使用**
- **UserController::index()は現在使用されていない**
- **PaginationControllerは既にページネーション対応済み**

## 影響範囲
- `backend/app/Http/Controllers/UserController.php` - indexメソッド（未使用）
- `backend/app/Http/Controllers/PaginationController.php` - 実際に使用されているコントローラー

## 修正内容
### UserController（予防的修正）
1. User::all()をUser::paginate()に置き換え
2. per_pageパラメータのサポート（デフォルト15件、最大100件）
3. 型安全性の向上（型キャスト追加）
4. @deprecatedアノテーションを追加して未使用であることを明確化

### PaginationController（既存実装の確認）
- 既にページネーション実装済み（デフォルト20件）
- per_pageの検証付き（1-100の範囲）
- キャッシュ機能付き（5分間）
- 検索、フィルタ、ソート機能完備

## テスト
### UserPaginationTest.php
- UserControllerの将来使用に備えたテスト
- 現在は使用されていないが、コードの正確性を保証

### PaginationControllerTest.php（新規追加）
- 実際のAPIエンドポイントのテスト
- ページネーション、検索、フィルタ、ソート、キャッシュ機能のテスト

## パフォーマンス目標
- ✅ 100万件のデータでもメモリエラーが発生しないこと（PaginationControllerで実現済み）
- ✅ レスポンス時間の維持または改善（キャッシュ機能で高速化済み）

## テスト方法
```bash
# 大量データでのテスト
docker compose exec backend php artisan app:init-database-production

# 実際のAPIエンドポイントのテスト（PaginationController）
curl http://localhost:8000/api/users
curl "http://localhost:8000/api/users?page=2&per_page=50"
curl "http://localhost:8000/api/users?q=検索語&status=active"

# テスト実行
docker compose exec backend ./vendor/bin/phpunit tests/Feature/PaginationControllerTest.php
docker compose exec backend ./vendor/bin/phpunit tests/Feature/UserPaginationTest.php
```

## 結論
- メモリ効率の問題は既にPaginationControllerで解決済み
- UserControllerの修正は予防的措置として実施
- 実運用への影響はないが、コードの品質向上に貢献