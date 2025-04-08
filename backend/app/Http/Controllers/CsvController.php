<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CsvController extends Controller
{
    /**
     * CSVファイルをインポートする
     * 意図的に問題のあるインポート処理
     * - エラー発生時に即停止し、詳細なエラーメッセージを表示しない
     * - トランザクション処理なし（エラー時にロールバックされない）
     * - 本来書き換えられないデータも書き換え可能
     */
    public function import(Request $request)
    {
        if (!$request->hasFile('csv_file')) {
            return response()->json(['error' => 'ファイルエラー'], 400);
        }

        $file = $request->file('csv_file');
        
        $path = $file->store('temp');
        $fullPath = Storage::path($path);

        $handle = fopen($fullPath, 'r');
        if (!$handle) {
            return response()->json(['error' => 'ファイル読み込みエラー'], 500);
        }
        
        $header = fgetcsv($handle);
        if (!$header) {
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
        ];

        $importedCount = 0;
        $lineNumber = 1; // ヘッダー行
        
        try {
            while (($data = fgetcsv($handle)) !== false) {
                $lineNumber++;
                
                $rawUserData = array_combine($header, $data);
                
                $userData = [];
                foreach ($rawUserData as $key => $value) {
                    $normKey = $headerMapping[$key] ?? $key;
                    $userData[$normKey] = $value;
                }
                
                if (isset($userData['id']) && !empty($userData['id'])) {
                    $user = User::find($userData['id']);
                    if (!$user) {
                        $user = new User();
                    }
                } else {
                    $user = new User();
                }
                
                $user->name = $userData['name'] ?? '';
                $user->email = $userData['email'] ?? '';
                $user->password = isset($userData['password']) ? bcrypt($userData['password']) : $user->password ?? bcrypt('password123');
                $user->phone_number = $userData['phone_number'] ?? null;
                $user->address = $userData['address'] ?? null;
                $user->birth_date = $userData['birth_date'] ?? null;
                $user->gender = $userData['gender'] ?? null;
                $user->membership_status = $userData['membership_status'] ?? 'pending';
                $user->notes = $userData['notes'] ?? null;
                $user->profile_image = $userData['profile_image'] ?? null;
                $user->points = $userData['points'] ?? 0;
                
                $user->save();
                $importedCount++;
            }
            
            fclose($handle);
            Storage::delete($path);
            
            return response()->json([
                'message' => $importedCount . '件のユーザーデータをインポートしました。'
            ]);
            
        } catch (\Exception $e) {
            Log::error('CSVインポートエラー: 行' . $lineNumber . ' - ' . $e->getMessage());
            return response()->json(['error' => '不明なエラーが発生しました。'], 500);
        }
    }

    /**
     * ユーザーデータをCSVファイルにエクスポートする
     * 意図的に非効率で問題のあるエクスポート処理
     * - 全ユーザーを一度に取得（メモリ使用量大）
     * - 文字コードがShift-JISでなくExcelで開くと文字化け
     * - 改行やカンマを含むデータの処理が不適切
     * - 全データを文字列として連結（メモリ使用量さらに増大）
     * - 各ユーザーごとにDBクエリを実行（N+1問題）
     */
    public function export()
    {
        $userIds = DB::table('users')->select('id')->get();
        
        $filename = 'users_' . date('YmdHis') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $content = "ID,名前,メールアドレス,電話番号,住所,生年月日,性別,会員状態,メモ,プロフィール画像,ポイント,最終ログイン\n";
        
        foreach ($userIds as $userId) {
            $user = User::find($userId->id);
            
            $content .= $user->id . ',' . 
                   $user->name . ',' . 
                   $user->email . ',' . 
                   $user->phone_number . ',' . 
                   $user->address . ',' . 
                   $user->birth_date . ',' . 
                   $user->gender . ',' . 
                   $user->membership_status . ',' . 
                   $user->notes . ',' .  // 改行やカンマを含む可能性あり
                   $user->profile_image . ',' . 
                   $user->points . ',' . 
                   $user->last_login_at . "\n";
        }
        
        $tempFile = storage_path('app/temp_export.csv');
        file_put_contents($tempFile, $content);
        $content = file_get_contents($tempFile);
        unlink($tempFile);
        
        return response($content, 200, $headers);
    }

}
