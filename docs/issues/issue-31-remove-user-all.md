# Issue #31: User::all()の除去とページネーション強制

## 問題の概要
UserControllerのindexメソッドでUser::all()が使用されており、大量のデータがある場合にメモリ不足を引き起こす可能性があります。

## 影響範囲
- `backend/app/Http/Controllers/UserController.php` - indexメソッド

## 修正内容
1. User::all()をUser::paginate()に置き換え
2. リクエストパラメータからper_pageを受け取る
3. デフォルトのページサイズを設定

## パフォーマンス目標
- 100万件のデータでもメモリエラーが発生しないこと
- レスポンス時間の維持または改善

## テスト方法
```bash
# 大量データでのテスト
docker compose exec backend php artisan app:init-database-production

# APIエンドポイントのテスト
curl http://localhost:8000/api/users
curl "http://localhost:8000/api/users?page=2&per_page=50"
```