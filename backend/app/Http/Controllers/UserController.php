<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::all();

        return response()->json($users);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return response()->json(['message' => 'Create form endpoint']);
    }

    /**
     * Store a newly created resource in storage.
     * バリデーションが不十分な状態（意図的に作成）
     */
    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);
        $data['membership_status'] = $data['membership_status'] ?? 'pending';
        try {
            $user = User::create($data);
            Log::info('User created', ['id' => $user->id, 'name' => $user->name]);

            // ページネーションキャッシュをクリア
            $this->clearPaginationCache();

            return response()->json($user, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'ユーザー登録に失敗しました'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::findOrFail($id);

        return response()->json($user);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $user = User::findOrFail($id);

        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, string $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validated();
        if (array_key_exists('password', $data) && $data['password']) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        Log::info('User updated', ['id' => $user->id]);

        // ページネーションキャッシュをクリア
        $this->clearPaginationCache();

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     * 意図的に削除後に画面が更新されない状態にする
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);

        $user->delete();
        Log::info('User deleted', ['id' => $id]);

        // ページネーションキャッシュをクリア
        $this->clearPaginationCache();

        return response()->json(['message' => 'User deleted successfully'], 200);
    }

    /**
     * バルク削除機能
     * - 個別選択：user_ids配列で指定されたユーザーを削除
     * - 全件選択：select_all=trueで全ユーザー削除
     * - 条件選択：select_all=trueかつfilters指定で条件に一致するユーザーを削除
     */
    public function bulkDelete(Request $request)
    {
        // デバッグ: リクエスト内容をログ出力
        Log::info('Bulk delete request received', [
            'raw_data' => $request->all(),
            'user_ids' => $request->input('user_ids'),
            'user_ids_type' => gettype($request->input('user_ids')),
            'first_id' => $request->input('user_ids') ? $request->input('user_ids')[0] ?? null : null,
            'first_id_type' => $request->input('user_ids') ? gettype($request->input('user_ids')[0] ?? null) : null,
        ]);

        // 存在するユーザーIDのみをフィルタリング
        if ($request->has('user_ids') && is_array($request->input('user_ids'))) {
            $requestedIds = $request->input('user_ids');
            $existingIds = User::whereIn('id', $requestedIds)->pluck('id')->toArray();
            $missingIds = array_diff($requestedIds, $existingIds);

            if (! empty($missingIds)) {
                Log::warning('Missing user IDs detected, filtering them out', [
                    'requested' => $requestedIds,
                    'existing' => $existingIds,
                    'missing' => $missingIds,
                ]);
                // 存在するIDのみに絞る
                $request->merge(['user_ids' => $existingIds]);
            }
        }

        $validated = $request->validate([
            'user_ids' => ['array', 'nullable'],
            'user_ids.*' => ['numeric'],
            'select_all' => ['boolean'],
            'select_type' => ['string', 'in:all,filtered', 'required_if:select_all,true'],
            'filters' => ['array', 'nullable', 'required_if:select_type,filtered'],
            'filters.q' => ['string', 'nullable'],
            'filters.status' => ['string', 'nullable'],
            'filters.created' => ['string', 'nullable', 'in:today,week,month,year'],
        ]);

        $deletedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            if ($validated['select_all'] ?? false) {
                // 全件または条件選択
                $query = User::query();

                if (($validated['select_type'] ?? '') === 'filtered' && ! empty($validated['filters'])) {
                    $filters = $validated['filters'];

                    // 検索条件を適用
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

                $deletedCount = $query->count();
                $query->delete();

            } else {
                // 個別選択
                $userIds = $validated['user_ids'] ?? [];
                if (empty($userIds)) {
                    return response()->json(['error' => '削除するユーザーが選択されていません'], 400);
                }

                // 実際に存在するユーザーIDのみを削除
                $existingUsers = User::whereIn('id', $userIds)->get();
                $deletedCount = $existingUsers->count();

                if ($deletedCount === 0) {
                    return response()->json([
                        'success' => false,
                        'message' => '削除対象のユーザーが見つかりませんでした',
                        'deleted_count' => 0,
                    ], 200);
                }

                User::whereIn('id', $existingUsers->pluck('id'))->delete();
            }

            DB::commit();

            // ページネーションキャッシュをクリア
            $this->clearPaginationCache();

            Log::info('Bulk delete completed', [
                'deleted_count' => $deletedCount,
                'select_all' => $validated['select_all'] ?? false,
                'select_type' => $validated['select_type'] ?? null,
                'user_ids_count' => count($validated['user_ids'] ?? []),
            ]);

            return response()->json([
                'success' => true,
                'message' => "{$deletedCount}件のユーザーを削除しました",
                'deleted_count' => $deletedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Bulk delete failed', [
                'error' => $e->getMessage(),
                'user_ids' => $validated['user_ids'] ?? [],
                'select_all' => $validated['select_all'] ?? false,
            ]);

            return response()->json([
                'error' => 'バルク削除処理中にエラーが発生しました',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ページネーションキャッシュをクリアする
     */
    private function clearPaginationCache()
    {
        try {
            // シンプルにすべてのキャッシュをクリア
            // 実際のアプリケーションでは、より精密な制御が必要
            Cache::flush();
            Log::info('All cache cleared after user operation');
        } catch (\Exception $e) {
            Log::warning('Failed to clear cache', ['error' => $e->getMessage()]);
        }
    }
}
