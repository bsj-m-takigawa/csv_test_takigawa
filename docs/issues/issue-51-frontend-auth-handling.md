# Issue #51: フロントエンドの認証エラー処理とPII保護の強化

## 優先度: 🔴 Critical

## 概要
認証が必要なAPIエンドポイントで401/403エラーが発生した際のリダイレクト処理が未実装で、存在しないAPIエンドポイントを呼び出している箇所がある。また、PII（個人識別情報）保護の観点から、全てのユーザー情報へのアクセスに認証を必須とする。

## 問題の詳細
1. **APIエンドポイントの不整合**
   - `exportUsers`関数が存在しない `/api/users/export-fast` を呼び出し（404エラー）
   - `bulkExportUsers`関数が存在しない `/api/users/bulk-export-fast` を呼び出し
   - 正しいエンドポイントは `/api/users/export` と `/api/users/bulk-export`

2. **認証エラー処理の欠如**
   - 401/403エラー時にログインページへのリダイレクトが実装されていない
   - ユーザーは認証が必要なことがわからず、エラーメッセージのみ表示される

3. **ユーザー体験の問題**
   - 認証が切れた状態でバルク操作を実行すると、単にエラーになるだけ
   - ログインページへの誘導がないため、ユーザーが混乱する

4. **PII保護の欠如**
   - ユーザー一覧、詳細情報が認証なしで閲覧可能
   - 個人情報が未認証ユーザーに露出するリスク

## 影響を受ける機能
- 全てのユーザー情報閲覧（一覧、詳細）
- CSVエクスポート機能
- バルクエクスポート機能
- バルク削除機能
- その他全てのユーザー関連操作

## 解決策

### 1. APIエンドポイントの修正
```typescript
// frontend/src/lib/api/users.ts
export const exportUsers = async () => {
  // '/api/users/export-fast' → '/api/users/export'
  const response = await fetch(`${API_URL}/users/export`);
}

export const bulkExportUsers = async (params: BulkOperationParams) => {
  // '/api/users/bulk-export-fast' → '/api/users/bulk-export'
  const response = await fetch(`${API_URL}/users/bulk-export`, {
    // ...
  });
}
```

### 2. 認証エラーハンドリングの実装
```typescript
// frontend/src/lib/api/users.ts
async function apiFetch(url: string, options: RequestInit = {}) {
  // ...
  
  if (!response.ok) {
    // 認証エラーの場合はログインページへリダイレクト
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        return;
      }
    }
    // ...
  }
}
```

### 3. ログインページの作成
- `/login` ルートの実装
- 認証フォームの作成
- 認証成功後の元ページへのリダイレクト

### 4. PII保護の強化
- 全てのユーザー情報APIに認証を必須化
- フロントエンドミドルウェアで全ユーザー関連ページを保護
- ホームページのみを公開ページとする

## 期待される効果
- 404エラーの解消
- 認証切れ時の適切なユーザー誘導
- ユーザー体験の向上
- PII（個人識別情報）の適切な保護
- セキュリティ強化

## 実装工数
- 見積もり: 1時間
- テスト: 30分

## 受け入れ基準
- [x] APIエンドポイントが正しく修正される
- [x] 401/403エラー時にログインページへリダイレクト
- [x] エクスポート機能が認証済みユーザーでのみ動作
- [x] バルク操作が認証済みユーザーで動作確認
- [x] ユーザー一覧・詳細が認証なしで閲覧不可
- [x] 全てのPIIが適切に保護される