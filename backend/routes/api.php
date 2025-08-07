<?php

use App\Http\Controllers\CsvController;
use App\Http\Controllers\FastCsvController;
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

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// CSV操作とステータスカウント（特定のパスを先に定義）
Route::middleware(['throttle:10,1'])->group(function () {
    Route::post('users/import', [CsvController::class, 'import']);
    Route::post('users/check-duplicates', [CsvController::class, 'checkDuplicates']);
    Route::get('users/export', [CsvController::class, 'export']);
    Route::get('users/export-fast', [FastCsvController::class, 'exportFast']); // 超高速エクスポート
    Route::get('users/sample-csv', [CsvController::class, 'sampleCsv']);
});

// Paginationエンドポイント（APIドキュメントに合わせて）
Route::get('pagination', [PaginationController::class, 'index']);
Route::get('pagination/status-counts', [PaginationController::class, 'statusCounts']);

// ステータスカウントAPI（下位互換性のため）
Route::get('users/status-counts', [PaginationController::class, 'statusCounts']);

// 公開API（読み取り専用）
Route::get('users', [PaginationController::class, 'index']);
Route::get('users/{user}', [UserController::class, 'show']);

// レート制限付きAPI（書き込み操作）
Route::middleware(['throttle:60,1'])->group(function () {
    Route::post('users', [UserController::class, 'store']);
    Route::put('users/{user}', [UserController::class, 'update']);
    Route::delete('users/{user}', [UserController::class, 'destroy']);

    // バルク操作API
    Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
    Route::post('users/bulk-export', [CsvController::class, 'bulkExport']);
    Route::post('users/bulk-export-fast', [FastCsvController::class, 'bulkExportFast']); // 超高速バルクエクスポート
});
