<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class PaginationController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort' => ['nullable', Rule::in(['name', 'email', 'membership_status', 'created_at', 'updated_at'])],
            'order' => ['nullable', Rule::in(['asc', 'desc'])],
            'q' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string'], // カンマ区切りの複数ステータス対応
            'created' => ['nullable', Rule::in(['today', 'week', 'month', 'year'])],
        ]);

        // キャッシュキーの生成
        $cacheKey = 'pagination:'.md5(serialize($validated));

        // タグ付きキャッシュから取得を試みる（5分間）
        $data = Cache::tags(['users', 'pagination'])->remember($cacheKey, 300, function () use ($validated) {
            return $this->getPaginatedData($validated);
        });

        return response()->json($data);
    }

    private function getPaginatedData($validated)
    {

        $perPage = (int) ($validated['per_page'] ?? 20);
        $sort = $validated['sort'] ?? 'created_at';
        $order = $validated['order'] ?? 'desc';
        $q = $validated['q'] ?? null;
        $statusFilter = $validated['status'] ?? null;
        $createdFilter = $validated['created'] ?? null;

        $query = User::query();

        // 検索条件（フルテキスト検索を優先）
        if ($q !== null && $q !== '') {
            if (config('database.default') === 'mysql') {
                // MySQLの場合はフルテキスト検索を使用
                $query->whereFullText(['name', 'email', 'phone_number'], $q);
            } else {
                // SQLite等の場合はLIKE検索（開発・テスト環境用）
                $query->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%")
                        ->orWhere('phone_number', 'like', "%{$q}%");
                });
            }
        }

        // ステータスフィルタ（複数対応）
        if ($statusFilter !== null && $statusFilter !== '') {
            $statuses = explode(',', $statusFilter);
            $query->whereIn('membership_status', $statuses);
        }

        // 作成日フィルタ
        if ($createdFilter !== null) {
            $now = now();
            switch ($createdFilter) {
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

        // ソート
        $query->orderBy($sort, $order);

        // Laravelの標準ページネーションを使用
        $paginator = $query->paginate($perPage);

        return [
            'data' => $paginator->items(),
            'meta' => [
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ];
    }

    /**
     * 各ステータスのユーザー数を取得
     */
    public function statusCounts(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
        ]);

        // キャッシュキーの生成
        $cacheKey = 'status_counts:'.md5(serialize($validated));

        // タグ付きキャッシュから取得を試みる（5分間）
        $counts = Cache::tags(['users', 'status_counts'])->remember($cacheKey, 300, function () use ($validated) {
            return $this->getStatusCounts($validated);
        });

        return response()->json($counts);
    }

    private function getStatusCounts($validated)
    {
        $q = $validated['q'] ?? null;
        $baseQuery = User::query();

        // 検索条件がある場合は適用（フルテキスト検索を優先）
        if ($q !== null && $q !== '') {
            if (config('database.default') === 'mysql') {
                // MySQLの場合はフルテキスト検索を使用
                $baseQuery->whereFullText(['name', 'email', 'phone_number'], $q);
            } else {
                // SQLite等の場合はLIKE検索（開発・テスト環境用）
                $baseQuery->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%")
                        ->orWhere('phone_number', 'like', "%{$q}%");
                });
            }
        }

        // 各ステータスのカウントを取得
        return [
            'active' => (clone $baseQuery)->where('membership_status', 'active')->count(),
            'inactive' => (clone $baseQuery)->where('membership_status', 'inactive')->count(),
            'pending' => (clone $baseQuery)->where('membership_status', 'pending')->count(),
            'expired' => (clone $baseQuery)->where('membership_status', 'expired')->count(),
            'total' => (clone $baseQuery)->count(),
        ];
    }
}
