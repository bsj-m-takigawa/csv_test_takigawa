# ページネーション仕様

## パラメータ
- page: 1以上の整数（デフォルト1）
- per_page: 1-100（デフォルト20）
- sort: name|email|membership_status|created_at
- order: asc|desc（デフォルトasc）
- q: キーワード(部分一致)

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

## 注意
- ページ境界超過時は空配列を返す
- ソート/フィルタ未指定時は作成日時昇順
