# デザインシステムガイド

## 概要
このプロジェクトのデザインシステムは、一貫性のあるUIを構築するための共通コンポーネントとデザイントークンを提供します。

## デザイン原則

### 1. シンプルさ
- ミニマルなデザイン
- 不要な装飾を排除
- 機能性を重視

### 2. 一貫性
- 統一されたカラーパレット
- 一貫したスペーシング
- 共通のコンポーネント使用

### 3. アクセシビリティ
- 適切なコントラスト比
- キーボードナビゲーション対応
- スクリーンリーダー対応

## カラーシステム

### Primary Colors
- **Primary**: `#3b82f6` - メインのアクションカラー
- **Gray Scale**: 10段階のグレースケール

### Semantic Colors
- **Success**: 成功・完了状態
- **Warning**: 警告・注意状態
- **Error**: エラー・危険状態
- **Info**: 情報提供

## コンポーネント

### Button
```tsx
import { Button } from '@/components/ui';

// Primary Button
<Button variant="primary">保存</Button>

// Secondary Button
<Button variant="secondary">キャンセル</Button>

// Danger Button
<Button variant="danger">削除</Button>

// Loading State
<Button isLoading>処理中...</Button>
```

### Input
```tsx
import { Input } from '@/components/ui';

<Input 
  label="メールアドレス"
  type="email"
  placeholder="example@email.com"
  error="有効なメールアドレスを入力してください"
/>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    コンテンツ
  </CardContent>
</Card>
```

### Table
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>名前</TableHead>
      <TableHead>メール</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>田中太郎</TableCell>
      <TableCell>tanaka@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Alert
```tsx
import { Alert } from '@/components/ui';

<Alert variant="success" title="成功">
  データが正常に保存されました。
</Alert>

<Alert variant="error" onClose={() => {}}>
  エラーが発生しました。
</Alert>
```

### Badge
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">アクティブ</Badge>
<Badge variant="warning">保留中</Badge>
<Badge variant="danger">無効</Badge>
```

## スペーシング
- 4pxベースのスペーシングシステム
- 一貫したパディングとマージン
- レスポンシブ対応

## タイポグラフィ
- フォントファミリー: Geist Sans (システムフォントフォールバック)
- フォントサイズ: 12px〜48px
- フォントウェイト: light(300)〜bold(700)

## 使用方法

1. **コンポーネントのインポート**
```tsx
import { Button, Input, Card } from '@/components/ui';
```

2. **デザイントークンの使用**
```tsx
import { colors, spacing, typography } from '@/styles/design-tokens';
```

3. **ユーティリティ関数**
```tsx
import { cn } from '@/lib/utils';

// クラス名の結合
<div className={cn('base-class', condition && 'conditional-class')} />
```

## ベストプラクティス

1. **共通コンポーネントの使用**
   - 独自のスタイルを作成する前に、既存のコンポーネントを確認
   - カスタマイズはプロパティとクラス名で対応

2. **デザイントークンの活用**
   - ハードコードされた値の代わりにトークンを使用
   - 一貫性のあるデザインを維持

3. **アクセシビリティ**
   - 適切なARIA属性の使用
   - キーボード操作のサポート
   - フォーカス状態の明確化

4. **レスポンシブデザイン**
   - モバイルファーストアプローチ
   - ブレークポイントの統一使用