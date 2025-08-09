<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvController extends Controller
{
    /**
     * CSVファイルをインポートする
     * 改善版：ファイルサイズ/MIME検証、トランザクション処理を実装
     */
    public function import(Request $request)
    {
        // 実行時間を無制限に設定（大量データインポート用）
        set_time_limit(0);
        // ファイルバリデーション
        $request->validate([
            'csv_file' => [
                'required',
                'file',
                'mimes:csv,txt',
                'max:10240', // 最大10MB
            ],
            'import_strategy' => [
                'required',
                'string',
                'in:create,update,skip',
            ],
        ]);

        $file = $request->file('csv_file');
        $importStrategy = $request->input('import_strategy');

        // MIME タイプの追加検証
        $mimeType = $file->getMimeType();
        if (! in_array($mimeType, ['text/csv', 'text/plain', 'application/csv'])) {
            return response()->json([
                'error' => 'CSVファイルのみアップロード可能です',
                'mime_type' => $mimeType,
            ], 400);
        }

        $path = $file->store('temp');
        $fullPath = Storage::path($path);

        $handle = fopen($fullPath, 'r');
        if (! $handle) {
            return response()->json(['error' => 'ファイル読み込みエラー'], 500);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            Storage::delete($path);

            return response()->json(['error' => 'CSVフォーマットエラー'], 400);
        }

        $headerMapping = [
            'ID' => 'id',
            '名前' => 'name',
            'メールアドレス' => 'email',
            '電話番号' => 'phone_number',
            '住所' => 'address',
            '生年月日' => 'birth_date',
            '性別' => 'gender',
            '会員状態' => 'membership_status',
            'メモ' => 'notes',
            'プロフィール画像' => 'profile_image',
            'ポイント' => 'points',
            '最終ログイン' => 'last_login_at',
            '作成日' => 'created_at',
            '更新日' => 'updated_at',
        ];

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errorCount = 0;
        $errors = [];
        $lineNumber = 1; // ヘッダー行
        $maxLines = 10001; // 最大行数制限（ヘッダー行を含めて10000レコード）
        $chunkSize = 100; // バッチサイズ（パフォーマンス最適化）

        // 全データを事前読み込み（メモリ効率化のため）
        $allData = [];
        $emailIndex = []; // メール重複チェック用インデックス

        // Step 1: CSVデータをメモリに読み込み
        try {
            while (($data = fgetcsv($handle)) !== false) {
                $lineNumber++;

                // 行数制限チェック
                if ($lineNumber > $maxLines) {
                    throw new \Exception("CSVファイルの行数が制限（{$maxLines}行）を超えています");
                }

                // ヘッダー/列数不一致をスキップ（安全性向上）
                if (count($header) !== count($data)) {
                    $errors[] = [
                        'line' => $lineNumber,
                        'error' => '列数がヘッダーと一致しません',
                    ];
                    $errorCount++;

                    continue;
                }

                $rawUserData = array_combine($header, $data);
                $userData = [];
                foreach ($rawUserData as $key => $value) {
                    $normKey = $headerMapping[$key] ?? $key;
                    $userData[$normKey] = $value;
                }

                $email = $userData['email'] ?? '';
                if (! empty($email)) {
                    $emailIndex[] = $email;
                }

                $allData[] = ['line' => $lineNumber, 'data' => $userData];
            }

            fclose($handle);
            Storage::delete($path);

            // Step 2: 全メールアドレスで一括重複チェック
            $existingUsers = [];
            if (! empty($emailIndex)) {
                $existingUsersCollection = User::whereIn('email', array_unique($emailIndex))
                    ->get(['id', 'email', 'name', 'phone_number', 'address', 'birth_date',
                        'gender', 'membership_status', 'notes', 'profile_image', 'points',
                        'last_login_at', 'created_at', 'updated_at']);

                foreach ($existingUsersCollection as $user) {
                    $existingUsers[$user->email] = $user;
                }
            }

            // Step 3: チャンク単位でバッチ処理
            $totalRecords = count($allData);
            $processedRecords = 0;

            for ($i = 0; $i < $totalRecords; $i += $chunkSize) {
                $chunk = array_slice($allData, $i, $chunkSize);

                DB::beginTransaction();
                try {
                    $usersToCreate = [];
                    $usersToUpdate = [];

                    foreach ($chunk as $record) {
                        $lineNumber = $record['line'];
                        $userData = $record['data'];
                        $email = $userData['email'] ?? '';

                        $existingUser = $existingUsers[$email] ?? null;

                        // IDが指定されている場合のチェック（バッチでは簡素化）
                        if (isset($userData['id']) && ! empty($userData['id']) && ! $existingUser) {
                            $userById = User::find($userData['id']);
                            if ($userById) {
                                $existingUser = $userById;
                            }
                        }

                        $isNew = ! $existingUser;

                        // 戦略に応じた処理
                        if ($existingUser && $importStrategy === 'skip') {
                            $skippedCount++;

                            continue;
                        }

                        if ($existingUser && $importStrategy === 'create') {
                            $errors[] = [
                                'line' => $lineNumber,
                                'error' => "メールアドレス「{$email}」は既に存在します",
                            ];
                            $errorCount++;

                            continue;
                        }

                        // ユーザーデータの準備（パフォーマンス最適化）
                        // デフォルトパスワードは強力なランダム値を生成
                        static $defaultPasswordHash = null;
                        if ($defaultPasswordHash === null) {
                            $defaultPasswordHash = Hash::make(Str::random(32));
                            Log::info('Generated random default password for CSV import');
                        }

                        $now = now();

                        // 日付フィールドのサニタイズとバリデーション
                        $birthDate = null;
                        if (! empty($userData['birth_date']) && $userData['birth_date'] !== '' && $userData['birth_date'] !== '?') {
                            $birthDate = $userData['birth_date'];
                        }

                        $lastLoginAt = null;
                        if (! empty($userData['last_login_at']) && $userData['last_login_at'] !== '' && $userData['last_login_at'] !== '?') {
                            $lastLoginAt = $userData['last_login_at'];
                        }

                        $createdAt = $now;
                        if (! empty($userData['created_at']) && $userData['created_at'] !== '' && $userData['created_at'] !== '?' && $isNew) {
                            $createdAt = $userData['created_at'];
                        }

                        $updatedAt = $now;
                        if (! empty($userData['updated_at']) && $userData['updated_at'] !== '' && $userData['updated_at'] !== '?') {
                            $updatedAt = $userData['updated_at'];
                        }

                        // フィールドのサニタイズ（空文字列と?をnullに）
                        $phoneNumber = (! empty($userData['phone_number']) && $userData['phone_number'] !== '' && $userData['phone_number'] !== '?') ? $userData['phone_number'] : null;
                        $address = (! empty($userData['address']) && $userData['address'] !== '' && $userData['address'] !== '?') ? $userData['address'] : null;
                        $gender = (! empty($userData['gender']) && $userData['gender'] !== '' && $userData['gender'] !== '?') ? $userData['gender'] : null;
                        $notes = (! empty($userData['notes']) && $userData['notes'] !== '' && $userData['notes'] !== '?') ? $userData['notes'] : null;
                        $profileImage = (! empty($userData['profile_image']) && $userData['profile_image'] !== '' && $userData['profile_image'] !== '?') ? $userData['profile_image'] : null;

                        $userAttributes = [
                            'name' => $userData['name'] ?? '',
                            'email' => $email,
                            'phone_number' => $phoneNumber,
                            'address' => $address,
                            'birth_date' => $birthDate,
                            'gender' => $gender,
                            'membership_status' => $userData['membership_status'] ?? 'pending',
                            'notes' => $notes,
                            'profile_image' => $profileImage,
                            'points' => isset($userData['points']) ? (int) $userData['points'] : 0,
                            'last_login_at' => $lastLoginAt,
                            'created_at' => $createdAt,
                            'updated_at' => $updatedAt,
                        ];

                        // パスワード処理
                        $passwordHash = $this->handlePasswordForUser($userData, $isNew, $defaultPasswordHash);

                        if ($isNew) {
                            // 新規ユーザーの場合、パスワードは必須
                            $userAttributes['password'] = $passwordHash;
                            $usersToCreate[] = $userAttributes;
                            $importedCount++;
                        } else {
                            // 更新用の属性をコピー（created_atは除外）
                            $updateAttributes = $userAttributes;
                            unset($updateAttributes['created_at']); // 更新時はcreated_atは変更しない

                            // 既存ユーザーのパスワードは明示的に値がある場合のみ更新
                            if ($passwordHash !== null) {
                                $updateAttributes['password'] = $passwordHash;
                            }
                            // パスワードがnullの場合は更新しない

                            User::where('id', $existingUser->id)->update($updateAttributes);
                            $updatedCount++;
                        }
                    }

                    // バッチで新規ユーザー作成
                    if (! empty($usersToCreate)) {
                        User::insert($usersToCreate);
                    }

                    DB::commit();
                    $processedRecords += count($chunk);

                    // プログレス記録（500件ごと）
                    if ($processedRecords % 500 === 0) {
                        Log::info('CSV import progress', [
                            'processed' => $processedRecords,
                            'total' => $totalRecords,
                            'progress_percent' => round(($processedRecords / $totalRecords) * 100, 1),
                            'memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                        ]);
                    }

                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            }

            Log::info('CSV imported successfully', [
                'imported_count' => $importedCount,
                'updated_count' => $updatedCount,
                'skipped_count' => $skippedCount,
                'error_count' => $errorCount,
                'strategy' => $importStrategy,
                'total_processed' => $processedRecords,
            ]);

            $totalProcessed = $importedCount + $updatedCount + $skippedCount + $errorCount;
            $message = [];

            if ($importedCount > 0) {
                $message[] = "{$importedCount}件を新規作成";
            }
            if ($updatedCount > 0) {
                $message[] = "{$updatedCount}件を更新";
            }
            if ($skippedCount > 0) {
                $message[] = "{$skippedCount}件をスキップ";
            }
            if ($errorCount > 0) {
                $message[] = "{$errorCount}件でエラー発生";
            }

            return response()->json([
                'success' => true,
                'message' => implode('、', $message),
                'results' => [
                    'imported' => $importedCount,
                    'updated' => $updatedCount,
                    'skipped' => $skippedCount,
                    'errors' => $errorCount,
                    'total_processed' => $totalProcessed,
                    'strategy' => $importStrategy,
                ],
                'errors' => array_slice($errors, 0, 100), // エラー詳細は最初の100件のみ
            ]);

        } catch (\Exception $e) {
            Log::error('CSVインポートエラー', [
                'line' => $lineNumber ?? 0,
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
            ]);

            return response()->json([
                'error' => 'インポート処理中にエラーが発生しました',
                'message' => $e->getMessage(),
                'line' => $lineNumber ?? 0,
            ], 500);
        }
    }

    /**
     * ユーザーデータをCSVファイルにエクスポートする（大規模データ対応版）
     * - カーソルベースのストリーミングで100万件規模に対応
     * - メモリ使用量を最小化（カーソル使用）
     * - BOM付きUTF-8でExcel対応
     * - タイムアウト対策（実行時間無制限）
     */
    public function export()
    {
        // 実行時間を無制限に設定（大量データエクスポート用）
        set_time_limit(0);

        $startTime = microtime(true);
        $initialMemory = memory_get_usage(true);

        $response = new StreamedResponse(function () use ($initialMemory, $startTime) {
            $handle = fopen('php://output', 'w');

            // BOM付きUTF-8でExcel対応
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // ヘッダー行を書き込む
            fputcsv($handle, $this->getCsvHeaders());

            $exportedCount = 0;
            $peakMemory = $initialMemory;

            // カーソルを使用してメモリ効率を最大化
            // cursorを使うことで一度に1レコードずつ処理し、メモリ使用量を最小限に
            $users = User::select(['id', 'name', 'email', 'phone_number', 'address', 'birth_date',
                'gender', 'membership_status', 'notes', 'profile_image', 'points',
                'last_login_at', 'created_at', 'updated_at'])
                ->cursor();

            foreach ($users as $user) {
                fputcsv($handle, $this->formatUserForCsv($user));
                $exportedCount++;

                // 1000件ごとに出力バッファをフラッシュ（ブラウザのタイムアウト防止）
                if ($exportedCount % 1000 === 0) {
                    flush();

                    // メモリ使用量を監視
                    $currentMemory = memory_get_usage(true);
                    $peakMemory = max($peakMemory, $currentMemory);

                    // 10000件ごとにログ出力
                    if ($exportedCount % 10000 === 0) {
                        Log::info('CSV export progress', [
                            'exported_count' => $exportedCount,
                            'memory_mb' => round($currentMemory / 1024 / 1024, 2),
                            'execution_time_seconds' => round(microtime(true) - $startTime, 2),
                        ]);
                    }

                    // ガベージコレクションを定期的に実行
                    if ($exportedCount % 5000 === 0 && function_exists('gc_collect_cycles')) {
                        gc_collect_cycles();
                    }
                }
            }

            fclose($handle);

            // エクスポート完了ログ
            $endTime = microtime(true);
            $executionTime = round($endTime - $startTime, 2);
            $memoryUsed = round(($peakMemory - $initialMemory) / 1024 / 1024, 2);

            Log::info('CSV export completed', [
                'exported_count' => $exportedCount,
                'execution_time_seconds' => $executionTime,
                'peak_memory_mb' => round($peakMemory / 1024 / 1024, 2),
                'memory_increase_mb' => $memoryUsed,
            ]);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="users_'.date('Y-m-d_His').'.csv"');
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

        return $response;
    }

    /**
     * CSVヘッダーを取得
     */
    private function getCsvHeaders(): array
    {
        return [
            'ID',
            '名前',
            'メールアドレス',
            '電話番号',
            '住所',
            '生年月日',
            '性別',
            '会員状態',
            'メモ',
            'プロフィール画像',
            'ポイント',
            '最終ログイン',
            '作成日',
            '更新日',
        ];
    }

    /**
     * ユーザーデータをCSV行にフォーマット
     */
    private function formatUserForCsv(User $user): array
    {
        return [
            $user->id,
            $user->name ?? '',
            $user->email ?? '',
            $user->phone_number ?? '',
            $user->address ?? '',
            $user->birth_date ?? '',
            $user->gender ?? '',
            $user->membership_status ?? '',
            $user->notes ?? '',
            $user->profile_image ?? '',
            $user->points ?? 0,
            $this->formatDateForCsv($user->last_login_at),
            $this->formatDateForCsv($user->created_at),
            $this->formatDateForCsv($user->updated_at),
        ];
    }

    /**
     * 日付フィールドを安全にフォーマット
     */
    private function formatDateForCsv($dateValue): string
    {
        if (empty($dateValue)) {
            return '';
        }

        // 既に文字列の場合はそのまま返す
        if (is_string($dateValue)) {
            return $dateValue;
        }

        // DateTimeオブジェクトの場合はformat()を使用
        if ($dateValue instanceof \DateTime || $dateValue instanceof \DateTimeInterface) {
            return $dateValue->format('Y-m-d H:i:s');
        }

        // その他の場合は文字列に変換
        return (string) $dateValue;
    }

    /**
     * CSVファイルの重複チェック（実際のインポートは行わない）
     */
    public function checkDuplicates(Request $request)
    {
        // 実行時間を無制限に設定（大量データチェック用）
        set_time_limit(0);
        // ファイルバリデーション
        $request->validate([
            'csv_file' => [
                'required',
                'file',
                'mimes:csv,txt',
                'max:10240', // 最大10MB
            ],
        ]);

        $file = $request->file('csv_file');

        // MIME タイプの追加検証
        $mimeType = $file->getMimeType();
        if (! in_array($mimeType, ['text/csv', 'text/plain', 'application/csv'])) {
            return response()->json([
                'error' => 'CSVファイルのみアップロード可能です',
                'mime_type' => $mimeType,
            ], 400);
        }

        $path = $file->store('temp');
        $fullPath = Storage::path($path);

        $handle = fopen($fullPath, 'r');
        if (! $handle) {
            return response()->json(['error' => 'ファイル読み込みエラー'], 500);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            Storage::delete($path);

            return response()->json(['error' => 'CSVフォーマットエラー'], 400);
        }

        $headerMapping = [
            'ID' => 'id',
            '名前' => 'name',
            'メールアドレス' => 'email',
            '電話番号' => 'phone_number',
            '住所' => 'address',
            '生年月日' => 'birth_date',
            '性別' => 'gender',
            '会員状態' => 'membership_status',
            'メモ' => 'notes',
            'プロフィール画像' => 'profile_image',
            'ポイント' => 'points',
            '最終ログイン' => 'last_login_at',
            '作成日' => 'created_at',
            '更新日' => 'updated_at',
        ];

        $duplicateDetails = [];
        $newUsers = [];
        $lineNumber = 1; // ヘッダー行
        $processedEmails = [];

        try {
            while (($data = fgetcsv($handle)) !== false) {
                $lineNumber++;
                // ヘッダー/列数不一致をスキップ
                if (count($header) !== count($data)) {
                    continue;
                }

                $rawUserData = array_combine($header, $data);
                $userData = [];
                foreach ($rawUserData as $key => $value) {
                    $normKey = $headerMapping[$key] ?? $key;
                    $userData[$normKey] = $value;
                }

                $email = $userData['email'] ?? '';
                if (empty($email)) {
                    continue; // メールアドレスがない行はスキップ
                }

                // CSVファイル内での重複もチェック
                if (in_array($email, $processedEmails)) {
                    continue; // 既にチェック済みのメールアドレス
                }
                $processedEmails[] = $email;

                // データベースで重複チェック
                $existingUser = null;
                if (! empty($email)) {
                    $existingUser = User::where('email', $email)->first();
                }

                // IDが指定されている場合のチェック
                if (isset($userData['id']) && ! empty($userData['id'])) {
                    $userById = User::find($userData['id']);
                    if ($userById) {
                        $existingUser = $userById;
                    }
                }

                if ($existingUser) {
                    $duplicateDetails[] = [
                        'line' => $lineNumber,
                        'csv_data' => [
                            'name' => $userData['name'] ?? '',
                            'email' => $email,
                            'phone_number' => $userData['phone_number'] ?? '',
                        ],
                        'existing_user' => [
                            'id' => $existingUser->id,
                            'name' => $existingUser->name,
                            'email' => $existingUser->email,
                            'phone_number' => $existingUser->phone_number,
                            'created_at' => $existingUser->created_at?->format('Y-m-d H:i:s'),
                            'updated_at' => $existingUser->updated_at?->format('Y-m-d H:i:s'),
                        ],
                    ];
                } else {
                    $newUsers[] = [
                        'line' => $lineNumber,
                        'name' => $userData['name'] ?? '',
                        'email' => $email,
                        'phone_number' => $userData['phone_number'] ?? '',
                    ];
                }
            }

            fclose($handle);
            Storage::delete($path);

            $totalRecords = count($duplicateDetails) + count($newUsers);
            $duplicateCount = count($duplicateDetails);
            $newCount = count($newUsers);

            // 推奨戦略の決定
            $recommendedStrategy = 'create'; // デフォルト
            $recommendations = [];

            if ($duplicateCount === 0) {
                $recommendedStrategy = 'create';
                $recommendations[] = '重複データがないため、「新規作成のみ」戦略を推奨します。';
            } elseif ($duplicateCount > 0 && $newCount > 0) {
                $recommendedStrategy = 'update';
                $recommendations[] = '重複データと新規データが混在しています。「更新優先」戦略を推奨します。';
            } else {
                $recommendedStrategy = 'skip';
                $recommendations[] = 'すべて重複データです。「スキップ」戦略を推奨します。';
            }

            return response()->json([
                'success' => true,
                'analysis' => [
                    'total_records' => $totalRecords,
                    'new_records' => $newCount,
                    'duplicate_records' => $duplicateCount,
                    'recommended_strategy' => $recommendedStrategy,
                    'recommendations' => $recommendations,
                ],
                'details' => [
                    'duplicates' => $duplicateDetails,
                    'new_users' => $newUsers,
                ],
            ]);

        } catch (\Exception $e) {
            fclose($handle);
            Storage::delete($path);

            Log::error('CSV重複チェックエラー', [
                'line' => $lineNumber,
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
            ]);

            return response()->json([
                'error' => '重複チェック処理中にエラーが発生しました',
                'message' => $e->getMessage(),
                'line' => $lineNumber,
            ], 500);
        }
    }

    /**
     * サンプルCSVテンプレートをダウンロード
     */
    public function sampleCsv()
    {
        $response = new StreamedResponse(function () {
            $handle = fopen('php://output', 'w');

            // BOM付きUTF-8でExcel対応
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // ヘッダー行を書き込む
            fputcsv($handle, $this->getCsvHeaders());

            // サンプルデータを書き込む
            $sampleData = [
                [
                    '', // ID（空白 - 新規作成時は不要）
                    '山田 太郎',
                    'taro@example.com',
                    '090-1234-5678',
                    '東京都渋谷区神宮前1-2-3',
                    '1990-01-15',
                    'male',
                    'active',
                    'サンプルユーザーです',
                    '',
                    '100',
                    '',
                    '',
                    '',
                ],
                [
                    '', // ID（空白）
                    '佐藤 花子',
                    'hanako@example.com',
                    '080-9876-5432',
                    '大阪府大阪市中央区1-1-1',
                    '1985-05-20',
                    'female',
                    'pending',
                    'テストユーザー',
                    '',
                    '50',
                    '',
                    '',
                    '',
                ],
                [
                    '', // ID（空白）
                    '田中 次郎',
                    'jiro@example.com',
                    '',
                    '',
                    '',
                    '',
                    'inactive',
                    '',
                    '',
                    '0',
                    '',
                    '',
                    '',
                ],
            ];

            foreach ($sampleData as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="sample_users.csv"');
        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }

    /**
     * バルクエクスポート機能（大規模データ対応版）
     * - 個別選択：user_ids配列で指定されたユーザーをエクスポート
     * - 全件選択：select_all=trueで全ユーザーエクスポート（100万件対応）
     * - 条件選択：select_all=trueかつfilters指定で条件に一致するユーザーをエクスポート
     * - カーソルベースのストリーミングで大規模データに対応
     */
    public function bulkExport(Request $request)
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

        // 実行時間を無制限に設定（大量データエクスポート用）
        set_time_limit(0);

        $startTime = microtime(true);
        $initialMemory = memory_get_usage(true);

        $response = new StreamedResponse(function () use ($validated, $initialMemory, $startTime) {
            $handle = fopen('php://output', 'w');

            // BOM付きUTF-8でExcel対応
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // ヘッダー行を書き込む
            fputcsv($handle, $this->getCsvHeaders());

            $exportedCount = 0;
            $peakMemory = $initialMemory;

            // クエリ構築
            if ($validated['select_all'] ?? false) {
                // 全件または条件選択
                $query = User::select(['id', 'name', 'email', 'phone_number', 'address', 'birth_date',
                    'gender', 'membership_status', 'notes', 'profile_image', 'points',
                    'last_login_at', 'created_at', 'updated_at']);

                if (($validated['select_type'] ?? '') === 'filtered' && ! empty($validated['filters'])) {
                    $filters = $validated['filters'];

                    // 検索条件を適用（PaginationControllerと同じロジック）
                    if (! empty($filters['q'])) {
                        $q = $filters['q'];
                        if (config('database.default') === 'mysql') {
                            $query->whereFullText(['name', 'email', 'phone_number'], $q);
                        } else {
                            $query->where(function ($sub) use ($q) {
                                $sub->where('name', 'like', "%{$q}%")
                                    ->orWhere('email', 'like', "%{$q}%")
                                    ->orWhere('phone_number', 'like', "%{$q}%");
                            });
                        }
                    }

                    // ステータスフィルタ
                    if (! empty($filters['status'])) {
                        $statuses = explode(',', $filters['status']);
                        $query->whereIn('membership_status', $statuses);
                    }

                    // 作成日フィルタ
                    if (! empty($filters['created'])) {
                        $now = now();
                        switch ($filters['created']) {
                            case 'today':
                                $query->whereDate('created_at', $now->toDateString());
                                break;
                            case 'week':
                                $query->whereBetween('created_at', [$now->startOfWeek(), $now->endOfWeek()]);
                                break;
                            case 'month':
                                $query->whereMonth('created_at', $now->month)
                                    ->whereYear('created_at', $now->year);
                                break;
                            case 'year':
                                $query->whereYear('created_at', $now->year);
                                break;
                        }
                    }
                }

            } else {
                // 個別選択
                $userIds = $validated['user_ids'] ?? [];
                if (empty($userIds)) {
                    // エラーの場合はヘッダーのみのCSV（空のデータ部）
                    fclose($handle);

                    return;
                }

                $query = User::select(['id', 'name', 'email', 'phone_number', 'address', 'birth_date',
                    'gender', 'membership_status', 'notes', 'profile_image', 'points',
                    'last_login_at', 'created_at', 'updated_at'])
                    ->whereIn('id', $userIds);
            }

            // カーソルを使用してメモリ効率を最大化（100万件対応）
            $users = $query->cursor();

            foreach ($users as $user) {
                fputcsv($handle, $this->formatUserForCsv($user));
                $exportedCount++;

                // 1000件ごとに出力バッファをフラッシュ（ブラウザのタイムアウト防止）
                if ($exportedCount % 1000 === 0) {
                    flush();

                    // メモリ使用量を監視
                    $currentMemory = memory_get_usage(true);
                    $peakMemory = max($peakMemory, $currentMemory);

                    // 10000件ごとにログ出力
                    if ($exportedCount % 10000 === 0) {
                        Log::info('Bulk CSV export progress', [
                            'exported_count' => $exportedCount,
                            'memory_mb' => round($currentMemory / 1024 / 1024, 2),
                            'execution_time_seconds' => round(microtime(true) - $startTime, 2),
                        ]);
                    }

                    // ガベージコレクションを定期的に実行
                    if ($exportedCount % 5000 === 0 && function_exists('gc_collect_cycles')) {
                        gc_collect_cycles();
                    }
                }
            }

            fclose($handle);

            // エクスポート完了ログ
            $endTime = microtime(true);
            $executionTime = round($endTime - $startTime, 2);
            $memoryUsed = round(($peakMemory - $initialMemory) / 1024 / 1024, 2);

            Log::info('Bulk CSV export completed', [
                'exported_count' => $exportedCount,
                'execution_time_seconds' => $executionTime,
                'peak_memory_mb' => round($peakMemory / 1024 / 1024, 2),
                'memory_increase_mb' => $memoryUsed,
                'select_all' => $validated['select_all'] ?? false,
                'select_type' => $validated['select_type'] ?? null,
                'user_ids_count' => count($validated['user_ids'] ?? []),
            ]);
        });

        // ファイル名を動的に生成
        $filename = 'selected_users_'.date('Y-m-d_His').'.csv';
        if ($validated['select_all'] ?? false) {
            $filename = ($validated['select_type'] === 'filtered')
                ? 'filtered_users_'.date('Y-m-d_His').'.csv'
                : 'all_users_'.date('Y-m-d_His').'.csv';
        }

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', "attachment; filename=\"{$filename}\"");
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

        return $response;
    }

    /**
     * ユーザーのパスワード処理をハンドル
     *
     * @param  array  $userData  CSVからのユーザーデータ
     * @param  bool  $isNew  新規ユーザーかどうか
     * @param  string  $defaultPasswordHash  デフォルトパスワードのハッシュ
     * @return string|null パスワードハッシュまたはnull
     */
    private function handlePasswordForUser(array $userData, bool $isNew, string $defaultPasswordHash): ?string
    {
        // パスワードが設定されていて、空白でない場合（trimで空白文字を除去）
        $hasPassword = isset($userData['password']) && trim($userData['password']) !== '';

        if ($isNew) {
            // 新規ユーザー：パスワードがあれば使用、なければデフォルト
            return $hasPassword
                ? Hash::make(trim($userData['password']))
                : $defaultPasswordHash;
        }

        // 既存ユーザー：パスワードがある場合のみ更新、なければnull
        return $hasPassword
            ? Hash::make(trim($userData['password']))
            : null;
    }
}
