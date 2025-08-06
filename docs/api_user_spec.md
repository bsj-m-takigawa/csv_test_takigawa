# ユーザーAPI仕様（提案）

## エンドポイント
- POST /api/users
- GET /api/users/{id}
- PUT /api/users/{id}
- DELETE /api/users/{id}

## 作成 (POST /api/users)
必須
- name: 文字列, 最大255
- email: 文字列, メール形式, 最大255, 一意
- password: 文字列, 最小8, confirmed（password_confirmation 必須）

任意
- phone_number: 文字列, 最大20
- address: 文字列, 最大255
- birth_date: 日付 (YYYY-MM-DD)
- gender: enum[male,female,other]
- membership_status: enum[active,inactive,pending,expired]
- notes: 文字列, 最大2000
- profile_image: URL

ルール
- password 未指定の自動生成は禁止
- エラー形式: 422 {"message":"...","errors":{"field":["..."]}}

## 更新 (PUT /api/users/{id})
- 全項目任意（作成と同じ制約）
- email: 自分以外と重複不可
- password: 指定時のみ最小8・confirmed。未指定なら変更なし
- points: このエンドポイントからは更新不可

## セキュリティ/整合性
- Eloquent/Query Builder + バインドのみ使用（生SQLの文字列連結は禁止）
- マスアサイン防止（points など保護フィールドは除外）
- 重要操作（作成/更新/削除/CSV）は構造化ログ＋PIIマスキング

## フロント要件
- 作成時は password と password_confirmation を含める
- バックエンドのバリデーションエラーをフィールド単位で表示

## レスポンス例
- 201 { user }
- 200 { user }
- 404 {"message":"User not found"}
- 422 {"message":"Validation error","errors":{...}}
