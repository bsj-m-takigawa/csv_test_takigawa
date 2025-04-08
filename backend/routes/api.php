<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CsvController;
use App\Http\Controllers\VulnerableController;
use App\Http\Controllers\PaginationController;

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

Route::get('users/all', [PaginationController::class, 'getUsersAll']);
Route::post('users/import', [CsvController::class, 'import']);
Route::get('users/export', [CsvController::class, 'export']);

Route::resource('users', UserController::class);
