# ユーザーAPI

ベースURL: /api

## エンドポイント
- GET /users?page={n}&per_page={m}&sort={field}&order={asc|desc}&q={keyword}  // ページネーションAPI
- GET /users/{id}
- POST /users
- PUT /users/{id}
- DELETE /users/{id}

## リクエスト/バリデーション
- 作成: name, email, password(confirmed) 必須。任意: phone/address/birth_date/gender/membership_status/notes/profile_image
- 更新: すべて任意。同一制約。email は自分を除外して一意、password は指定時のみ confirmed 必須
- 禁止: 一般エンドポイントからの points 更新

## レスポンス
- 200/201: 単体ユーザー または ページネート結果 {data[], meta{total,page,per_page,pages}}
- 422: 不正なパラメータ（page, per_page, sort, order）
- 404: {message}
- 422: {message, errors{...}}

## 注記
- Eloquent/Query Builder を使用し、生SQLは避ける
- 全ての入力に FormRequest を使用
- 将来的に保護操作には認証を必須化
