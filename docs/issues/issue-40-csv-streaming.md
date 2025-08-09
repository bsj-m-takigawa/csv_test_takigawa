# Issue #40: CSVメモリ効率の改善（ストリーミング処理） [CLOSED]

## 問題の概要
現在のCSVインポート/エクスポート処理は、ファイル全体をメモリに読み込むため、大規模CSVファイル（100万件規模）でメモリ不足のリスクがある。

## 影響範囲
- `backend/app/Http/Controllers/CsvController.php`
- CSVインポート処理
- CSVエクスポート処理
- メモリ使用量とパフォーマンス

## 現状の問題点

### インポート時
```php
// 現在の実装（問題あり）
$users = [];
while (($data = fgetcsv($handle)) !== false) {
    $users[] = $userData;  // メモリに蓄積
}
User::insert($users);  // 一括挿入
```

### エクスポート時
```php
// 現在の実装（部分的に最適化済み）
User::chunk(1000, function ($users) {
    // チャンク処理はあるが、さらなる最適化が可能
});
```

## 改善案

### 1. インポート処理のストリーミング化
- チャンク単位でのバッチ処理
- メモリ使用量の制限
- プログレス通知の実装

### 2. エクスポート処理の最適化
- ストリーミングレスポンスの改善
- メモリバッファの最適化
- 大規模データセットの効率的な処理

### 3. エラーハンドリングの改善
- 部分的な失敗の処理
- リトライ機能
- エラーレポートの生成

## 実装内容

### Phase 1: インポート処理の改善
```php
// チャンク単位でのバッチ処理
$chunkSize = 1000;
$batch = [];
while (($data = fgetcsv($handle)) !== false) {
    $batch[] = $userData;
    
    if (count($batch) >= $chunkSize) {
        $this->processBatch($batch);
        $batch = [];
    }
}
// 残りのデータを処理
if (!empty($batch)) {
    $this->processBatch($batch);
}
```

### Phase 2: エクスポート処理の改善
```php
// ストリーミングレスポンス
return response()->stream(function () use ($query) {
    $handle = fopen('php://output', 'w');
    
    // ヘッダー出力
    fputcsv($handle, ['ID', '名前', 'メール', ...]);
    
    // チャンク処理でメモリ効率化
    $query->chunk(500, function ($users) use ($handle) {
        foreach ($users as $user) {
            fputcsv($handle, $this->formatUserData($user));
        }
        
        // バッファをフラッシュ
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    });
    
    fclose($handle);
}, 200, $headers);
```

## テスト項目
- [ ] 100万件のCSVインポートが成功する
- [ ] メモリ使用量が設定値以下に収まる
- [ ] エラー時の部分的なロールバック
- [ ] プログレス通知が正しく動作する

## 期待効果
- メモリ使用量: 90%削減
- 処理速度: 30%向上
- 安定性: 大規模ファイルでもOOM防止

## 優先度
High（本番環境での安定性に直結）