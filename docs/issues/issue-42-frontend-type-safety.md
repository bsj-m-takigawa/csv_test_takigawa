# Issue #42: フロントエンドの型定義強化

## 問題の概要
現在のフロントエンド実装では、TypeScriptの型定義が不十分な箇所があり、型安全性が完全に保証されていません。

## 現状の問題点

### 1. 型定義の不足
- APIレスポンスの型が一部`any`を使用
- エラーハンドリングで型が曖昧
- イベントハンドラーの型定義が不完全

### 2. 型の不整合
- バックエンドのレスポンス形式と型定義の乖離
- オプショナルプロパティの扱いが不明確
- Union型の適切な使用ができていない

### 3. 型推論の活用不足
- 明示的な型注釈が過剰
- ジェネリクスの活用不足
- 型ガードの未実装

## 影響範囲

### 主要ファイル
- `frontend/src/lib/api/users.ts` - API クライアント
- `frontend/src/lib/api/auth.ts` - 認証関連
- `frontend/src/app/users/list/page.tsx` - ユーザー一覧
- `frontend/src/components/*.tsx` - 各種コンポーネント

### 型定義ファイル
- `frontend/src/types/user.ts` - ユーザー関連の型
- `frontend/src/types/api.ts` - APIレスポンスの型（新規作成予定）

## 提案する解決策

### 1. 包括的な型定義の作成
```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: number;
}
```

### 2. 型ガードの実装
```typescript
// Type guard for error responses
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
};
```

### 3. Zodによるランタイム検証
```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  membership_status: z.enum(['active', 'inactive', 'pending', 'expired']),
  // ...
});

export type User = z.infer<typeof UserSchema>;
```

## 実装計画

### Phase 1: 基礎的な型定義
1. APIレスポンスの共通型定義
2. エラー型の統一
3. 既存の`any`型の除去

### Phase 2: 型ガードとユーティリティ
1. 型ガード関数の実装
2. ユーティリティ型の作成
3. ジェネリクスの適切な使用

### Phase 3: ランタイム検証
1. Zodスキーマの定義
2. APIレスポンスの検証
3. フォーム入力の検証

## テスト要件
- TypeScriptコンパイラでのエラーゼロ
- strictモードでの動作確認
- 型推論のカバレッジ測定

## 成功基準
- `any`型の使用ゼロ（やむを得ない場合を除く）
- 型エラーによる実行時エラーの防止
- IDE上での正確な型補完
- ビルド時の型チェックパス率100%

## 期待される効果
- 開発時のエラー早期発見
- リファクタリングの安全性向上
- コードの可読性と保守性向上
- 新規開発者のオンボーディング改善