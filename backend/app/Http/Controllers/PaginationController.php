<?php

namespace App\Http\Controllers;

use App\Models\User;

class PaginationController extends Controller
{
    /**
     * ユーザー一覧を取得
     */
    public function getUsersAll()
    {
        $users = User::all();

        return response()->json([
            'users' => $users,
            'total' => count($users),
        ]);
    }
}
