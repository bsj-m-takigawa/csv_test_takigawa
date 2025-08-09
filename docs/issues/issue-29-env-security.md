# Issue #29: .envファイルの削除とセキュリティ強化

## 問題の概要
.envファイルがGitリポジトリにコミットされており、機密情報（データベース認証情報、APIキー等）が漏洩するリスクがある。

## 影響範囲
- **ファイル**: 
  - `.env` (ルート)
  - `backend/.env`
  - `frontend/.env.local` (存在する場合)
- **影響度**: Critical（セキュリティ脆弱性）

## 詳細な問題点
1. **機密情報の露出**
   - データベースのパスワード
   - APIキー
   - アプリケーションシークレット

2. **セキュリティリスク**
   - 公開リポジトリの場合、誰でも認証情報にアクセス可能
   - プライベートリポジトリでも、アクセス権を持つ全員が機密情報を閲覧可能

## 修正方針

1. **.envファイルをGit履歴から完全に削除**
   - git filter-branchまたはBFG Repo-Cleanerを使用
   - 既存の.envファイルを削除

2. **.gitignoreの更新**
   - .envファイルが二度とコミットされないように設定

3. **環境変数の再生成**
   - 新しいパスワードとキーを生成
   - .env.exampleファイルを更新

4. **ドキュメントの更新**
   - セットアップ手順に.env設定を明記

## 修正内容

### .gitignore更新
```gitignore
# 環境設定ファイル
.env
.env.*
!.env.example
backend/.env
frontend/.env.local
```

### 手順
1. 現在の.envファイルの内容を安全な場所にバックアップ
2. Git履歴から.envファイルを削除
3. .gitignoreを更新
4. 新しい認証情報を生成
5. チームメンバーに通知

## テスト項目
- [ ] .envファイルがGit履歴から削除されている
- [ ] .gitignoreが正しく設定されている
- [ ] 新しい.envファイルがコミットされない
- [ ] アプリケーションが新しい認証情報で正常動作する

## 参考情報
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)