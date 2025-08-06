# ページネーション仕様

## パラメータ
- page: 1以上の整数（デフォルト1）
- per_page: 1-100（デフォルト20）
- sort: name|email|membership_status|created_at
- order: asc|desc（デフォルトasc）
- q: キーワード(部分一致、name/emailを対象)

## レスポンス
{
  "data": [ ...users ],
  "meta": {
    "total": 123,
    "page": 2,
    "per_page": 20,
    "pages": 7
  }
}

## 仕様
- クエリ例: /api/users?page=2&per_page=20&sort=created_at&order=desc&q=taro
- バリデーション: page/per_pageは数値, sort/orderはallowlist
- エラー: 無効なパラメータは422 {message, errors}
- Caching: なし（将来導入）

## 注意
- ページ境界超過時は空配列を返す
- ソート/フィルタ未指定時はcreated_at昇順
