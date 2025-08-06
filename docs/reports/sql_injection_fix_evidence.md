# SQLインジェクション対策 実施エビデンス

対象: backend/app/Http/Controllers/UserController.php, backend/app/Console/Commands/SqlInjectionDemo.php

変更概要
- UserController@show: RAW SQL 連結を廃止し `User::find()` に置換。見つからない場合は 404。
- UserController@update: RAW SQL による存在確認と `$request->all()` を廃止。`User::find()` + `$request->only([...])` の明示更新に置換し、パスワードは `Hash::make`。
- Userモデル: `$fillable` から `points` を除外し、保護フィールドのマスアサイン防止。
- SqlInjectionDemo: 文字列連結クエリを `?` のパラメータバインドに置換。

テスト/確認
- PHPUnit サンプル実行: OK (2 tests)
- 期待挙動: 任意の `id` 文字列注入でも複数件取得/更新は不可。`find` により不正なIDはヒットせず404。

実行/参考
- php artisan test
- ./vendor/bin/phpunit
