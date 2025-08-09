# セキュリティガイドライン

## 環境変数の管理

### 重要事項
- **絶対に.envファイルをコミットしないでください**
- 機密情報（パスワード、APIキー等）は環境変数で管理します
- .envファイルは.gitignoreで除外されています

### セットアップ手順

1. **バックエンド設定**
   ```bash
   cd backend
   cp .env.example .env
   # .envファイルを編集して実際の値を設定
   ```

2. **フロントエンド設定**
   ```bash
   cd frontend
   cp .env.example .env.local
   # .env.localファイルを編集して実際の値を設定
   ```

### 環境変数の例

#### Backend (.env)
```env
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=<強力なパスワードを設定>

CACHE_DRIVER=redis
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## セキュリティチェックリスト

### コミット前の確認
- [ ] .envファイルが含まれていないか
- [ ] パスワードやAPIキーがコードに直接記述されていないか
- [ ] console.logにセンシティブな情報が出力されていないか
- [ ] エラーメッセージに機密情報が含まれていないか

### 定期的な確認
- [ ] 依存関係の脆弱性チェック（`npm audit`, `composer audit`）
- [ ] パスワードの定期的な変更
- [ ] アクセスログの監視
- [ ] 不要なデバッグ情報の削除

## インシデント対応

もし機密情報を誤ってコミットした場合：

1. **即座に対応**
   - 該当するパスワード/キーを無効化
   - 新しい認証情報を生成
   - チームメンバーに通知

2. **セキュリティ状態の確認**
   ```bash
   # scripts/check-env-security.shを使用
   ./scripts/check-env-security.sh
   ```

3. **必要に応じた対応**
   - 影響範囲を特定
   - パスワード・キーの変更を優先
   - Git履歴の書き換えは最終手段として検討

## 連絡先

セキュリティに関する問題を発見した場合は、即座に開発チームリーダーに報告してください。