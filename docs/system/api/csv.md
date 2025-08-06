# CSV 仕様

## インポート
- エンドポイント: POST /api/csv/import (multipart/form-data, csv_file)
- ヘッダ例: ID,名前,メールアドレス,電話番号,住所,生年月日,性別,会員状態,メモ,プロフィール画像,ポイント,最終ログイン
- 行単位検証: email形式、重複、必須(name,email)、日付(YYYY-MM-DD)
- バッチ: 一定件数ごとにトランザクション。失敗時はロールバック
- エラー行: 行番号/理由を含むCSVを返却可能にする

## エクスポート
- エンドポイント: GET /api/csv/export (text/csv)
- 方式: chunk + streamed response
- ヘッダ固定: 上記と同一順序
- 値の正規化: カンマ/改行を含むフィールドはクオート、改行は\n
