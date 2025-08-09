<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CsvController;
use App\Http\Controllers\PaginationController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// 認証エンドポイント
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
});

// CSV操作（認証必須の書き込み系）
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::post('users/import', [CsvController::class, 'import']);
    Route::post('users/check-duplicates', [CsvController::class, 'checkDuplicates']);
});

// CSV操作（PII保護のため認証必須）
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::get('users/export', [CsvController::class, 'export']); // 統合された高速エクスポート（1.8秒/100万件）
    Route::get('users/sample-csv', [CsvController::class, 'sampleCsv']);
});

// 認証必須API（PII保護のため全ユーザー情報へのアクセスに認証が必要）
Route::middleware(['auth:sanctum'])->group(function () {
    // Paginationエンドポイント（APIドキュメントに合わせて）
    Route::get('pagination', [PaginationController::class, 'index']);
    Route::get('pagination/status-counts', [PaginationController::class, 'statusCounts']);

    // ステータスカウントAPI（下位互換性のため）
    Route::get('users/status-counts', [PaginationController::class, 'statusCounts']);

    // ユーザー情報API（読み取りも認証必須）
    Route::get('users', [PaginationController::class, 'index']);
    Route::get('users/{user}', [UserController::class, 'show']);
});

// 認証必須API（書き込み操作）
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('users', [UserController::class, 'store']);
    Route::put('users/{user}', [UserController::class, 'update']);
    Route::delete('users/{user}', [UserController::class, 'destroy']);

    // バルク操作API（認証必須）
    Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
    Route::post('users/bulk-export', [CsvController::class, 'bulkExport']); // 統合された高速バルクエクスポート
});
