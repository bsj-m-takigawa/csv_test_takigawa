# Issue #31: CSVインポート時のパスワード処理の修正 [CLOSED]

## 問題の概要
CSVインポート時に、既存ユーザーのパスワードが意図せずリセットされる重大なバグが存在する。

## 影響範囲
- **ファイル**: `backend/app/Http/Controllers/CsvController.php`
- **メソッド**: `import()`
- **影響度**: High（データ破壊リスク）

## 詳細な問題点

### 現在の実装の問題
```php
// 問題のコード
'password' => isset($userData['password']) ? 
    bcrypt($userData['password']) : 
    $defaultPasswordHash,  // 既存ユーザーも上書きされる
```

1. **新規ユーザー作成時**
   - CSVにパスワードがある → 指定されたパスワードを設定 ✅
   - CSVにパスワードがない → デフォルトパスワードを設定 ✅

2. **既存ユーザー更新時**（問題）
   - CSVにパスワードがある → パスワードが変更される ⚠️
   - CSVにパスワードがない → デフォルトパスワードにリセット 🔴

## 修正方針

1. **新規ユーザーと既存ユーザーの処理を分離**
   - 新規作成時のみパスワードを必須設定
   - 更新時はパスワード列が明示的に指定された場合のみ変更

2. **デフォルトパスワードの改善**
   - 固定値（password123）から強力なランダム値に変更
   - セキュリティリスクの軽減

3. **バリデーション強化**
   - パスワード変更の際は明示的な確認

## 修正内容

### CsvController.php
```php
// 新規作成時
if ($isNew) {
    $userAttributes['password'] = isset($userData['password']) && $userData['password'] !== ''
        ? Hash::make($userData['password'])
        : $defaultPasswordHash;  // ランダムな強力パスワード
}

// 既存ユーザー更新時
if (!$isNew) {
    // パスワードはCSVに明示的に値がある場合のみ更新
    if (isset($userData['password']) && $userData['password'] !== '') {
        $updateAttributes['password'] = Hash::make($userData['password']);
    } else {
        // パスワード列を更新対象から除外
        unset($updateAttributes['password']);
    }
}
```

## テスト項目
- [ ] 新規ユーザー作成時にパスワードが正しく設定される
- [ ] 既存ユーザー更新時にパスワードが勝手に変更されない
- [ ] CSVで明示的にパスワードを指定した場合のみ更新される
- [ ] デフォルトパスワードがランダムで強力である

## 参考情報
- レビューで指摘された重大度: High
- 影響を受けるユーザー: CSVインポート機能を使用する全ユーザー