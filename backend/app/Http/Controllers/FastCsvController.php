<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * 超高速CSVエクスポートコントローラー
 * 100万件を10秒未満でエクスポートするための最適化版
 */
class FastCsvController extends Controller
{
    /**
     * 超高速CSVエクスポート（100万件を10秒未満目標）
     * 
     * 最適化戦略：
     * 1. 生SQLでオーバーヘッド削減
     * 2. PDOカーソルで直接ストリーミング
     * 3. 最小限のデータ変換
     * 4. 大きなバッファサイズ
     * 5. 不要な処理の排除
     */
    public function exportFast()
    {
        // 実行時間を無制限に設定
        set_time_limit(0);
        
        // 出力バッファリングを無効化（直接ストリーミング）
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        $startTime = microtime(true);

        $response = new StreamedResponse(function () use ($startTime) {
            // 大きなバッファサイズを設定（64KB）
            $bufferSize = 65536;
            stream_set_write_buffer(fopen('php://output', 'w'), $bufferSize);
            
            $handle = fopen('php://output', 'w');

            // BOM付きUTF-8でExcel対応
            fwrite($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // ヘッダー行を書き込む（単一のfwrite呼び出し）
            fwrite($handle, "ID,名前,メールアドレス,電話番号,住所,生年月日,性別,会員状態,メモ,プロフィール画像,ポイント,最終ログイン,作成日,更新日\n");

            // 生SQLで直接PDOカーソルを使用（Eloquentのオーバーヘッドを回避）
            $pdo = DB::getPdo();
            $pdo->setAttribute(\PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false); // アンバッファードクエリ
            
            $sql = "SELECT 
                id, name, email, phone_number, address, birth_date,
                gender, membership_status, notes, profile_image, points,
                last_login_at, created_at, updated_at
                FROM users";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            $exportedCount = 0;
            $buffer = '';
            $bufferRows = 0;
            $maxBufferRows = 1000; // 1000行ごとにフラッシュ
            
            while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
                // 最小限の処理で直接CSV文字列を構築
                $csvLine = $this->buildCsvLine($row);
                $buffer .= $csvLine;
                $bufferRows++;
                $exportedCount++;
                
                // バッファが一定サイズに達したらフラッシュ
                if ($bufferRows >= $maxBufferRows) {
                    fwrite($handle, $buffer);
                    $buffer = '';
                    $bufferRows = 0;
                    
                    // 10万件ごとにログ（ログも最小限に）
                    if ($exportedCount % 100000 === 0) {
                        $elapsed = round(microtime(true) - $startTime, 2);
                        Log::info("Fast CSV export: {$exportedCount} rows in {$elapsed}s");
                    }
                }
            }
            
            // 残りのバッファをフラッシュ
            if ($buffer !== '') {
                fwrite($handle, $buffer);
            }
            
            fclose($handle);
            
            // 完了ログ
            $endTime = microtime(true);
            $executionTime = round($endTime - $startTime, 2);
            
            Log::info('Fast CSV export completed', [
                'exported_count' => $exportedCount,
                'execution_time_seconds' => $executionTime,
                'rows_per_second' => round($exportedCount / $executionTime),
            ]);
        });

        // レスポンスヘッダーを最小限に
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="users_fast_'.date('YmdHis').'.csv"');
        $response->headers->set('X-Accel-Buffering', 'no'); // nginxのバッファリング無効化

        return $response;
    }
    
    /**
     * 高速CSV行構築（最小限の処理）
     */
    private function buildCsvLine(array $row): string
    {
        // 各フィールドを適切にエスケープ
        $escaped = [];
        foreach ($row as $value) {
            if ($value === null) {
                $escaped[] = '';
            } elseif (strpos($value, ',') !== false || strpos($value, '"') !== false || strpos($value, "\n") !== false) {
                // 特殊文字がある場合のみクォート
                $escaped[] = '"' . str_replace('"', '""', $value) . '"';
            } else {
                $escaped[] = $value;
            }
        }
        
        return implode(',', $escaped) . "\n";
    }
    
    /**
     * 超高速バルクエクスポート
     */
    public function bulkExportFast(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => ['array', 'nullable'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'select_all' => ['boolean'],
            'select_type' => ['string', Rule::in(['all', 'filtered']), 'required_if:select_all,true'],
            'filters' => ['array', 'nullable', 'required_if:select_type,filtered'],
            'filters.q' => ['string', 'nullable'],
            'filters.status' => ['string', 'nullable'],
            'filters.created' => ['string', 'nullable', Rule::in(['today', 'week', 'month', 'year'])],
        ]);

        // 実行時間を無制限に設定
        set_time_limit(0);
        
        // 出力バッファリングを無効化
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        $startTime = microtime(true);

        $response = new StreamedResponse(function () use ($validated, $startTime) {
            $bufferSize = 65536;
            stream_set_write_buffer(fopen('php://output', 'w'), $bufferSize);
            
            $handle = fopen('php://output', 'w');

            // BOM付きUTF-8でExcel対応
            fwrite($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // ヘッダー行
            fwrite($handle, "ID,名前,メールアドレス,電話番号,住所,生年月日,性別,会員状態,メモ,プロフィール画像,ポイント,最終ログイン,作成日,更新日\n");

            // SQLクエリの構築
            $sql = "SELECT 
                id, name, email, phone_number, address, birth_date,
                gender, membership_status, notes, profile_image, points,
                last_login_at, created_at, updated_at
                FROM users";
            
            $bindings = [];
            $conditions = [];
            
            if ($validated['select_all'] ?? false) {
                if (($validated['select_type'] ?? '') === 'filtered' && !empty($validated['filters'])) {
                    $filters = $validated['filters'];
                    
                    // 検索条件
                    if (!empty($filters['q'])) {
                        $q = $filters['q'];
                        // フルテキスト検索を使用（MySQLの場合）
                        if (config('database.default') === 'mysql') {
                            $conditions[] = "MATCH(name, email, phone_number) AGAINST(? IN BOOLEAN MODE)";
                            $bindings[] = $q;
                        } else {
                            $conditions[] = "(name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
                            $searchTerm = "%{$q}%";
                            $bindings[] = $searchTerm;
                            $bindings[] = $searchTerm;
                            $bindings[] = $searchTerm;
                        }
                    }
                    
                    // ステータスフィルタ
                    if (!empty($filters['status'])) {
                        $statuses = explode(',', $filters['status']);
                        $placeholders = str_repeat('?,', count($statuses) - 1) . '?';
                        $conditions[] = "membership_status IN ({$placeholders})";
                        $bindings = array_merge($bindings, $statuses);
                    }
                    
                    // 作成日フィルタ
                    if (!empty($filters['created'])) {
                        $now = now();
                        switch ($filters['created']) {
                            case 'today':
                                $conditions[] = "DATE(created_at) = ?";
                                $bindings[] = $now->toDateString();
                                break;
                            case 'week':
                                $conditions[] = "created_at BETWEEN ? AND ?";
                                $bindings[] = $now->startOfWeek()->toDateTimeString();
                                $bindings[] = $now->endOfWeek()->toDateTimeString();
                                break;
                            case 'month':
                                $conditions[] = "MONTH(created_at) = ? AND YEAR(created_at) = ?";
                                $bindings[] = $now->month;
                                $bindings[] = $now->year;
                                break;
                            case 'year':
                                $conditions[] = "YEAR(created_at) = ?";
                                $bindings[] = $now->year;
                                break;
                        }
                    }
                }
            } else {
                // 個別選択
                $userIds = $validated['user_ids'] ?? [];
                if (empty($userIds)) {
                    fclose($handle);
                    return;
                }
                
                $placeholders = str_repeat('?,', count($userIds) - 1) . '?';
                $conditions[] = "id IN ({$placeholders})";
                $bindings = $userIds;
            }
            
            // WHERE句を追加
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(' AND ', $conditions);
            }
            
            // PDOで直接実行
            $pdo = DB::getPdo();
            $pdo->setAttribute(\PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($bindings);
            
            $exportedCount = 0;
            $buffer = '';
            $bufferRows = 0;
            $maxBufferRows = 1000;
            
            while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
                $csvLine = $this->buildCsvLine($row);
                $buffer .= $csvLine;
                $bufferRows++;
                $exportedCount++;
                
                if ($bufferRows >= $maxBufferRows) {
                    fwrite($handle, $buffer);
                    $buffer = '';
                    $bufferRows = 0;
                }
            }
            
            // 残りのバッファをフラッシュ
            if ($buffer !== '') {
                fwrite($handle, $buffer);
            }
            
            fclose($handle);
            
            // 完了ログ
            $executionTime = round(microtime(true) - $startTime, 2);
            
            Log::info('Fast bulk CSV export completed', [
                'exported_count' => $exportedCount,
                'execution_time_seconds' => $executionTime,
                'rows_per_second' => round($exportedCount / $executionTime),
            ]);
        });

        // ファイル名を動的に生成
        $filename = 'selected_users_fast_'.date('YmdHis').'.csv';
        if ($validated['select_all'] ?? false) {
            $filename = ($validated['select_type'] === 'filtered')
                ? 'filtered_users_fast_'.date('YmdHis').'.csv'
                : 'all_users_fast_'.date('YmdHis').'.csv';
        }

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', "attachment; filename=\"{$filename}\"");
        $response->headers->set('X-Accel-Buffering', 'no');

        return $response;
    }
}