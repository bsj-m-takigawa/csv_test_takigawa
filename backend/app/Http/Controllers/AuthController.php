<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * ログイン処理
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_name' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        // タイミング攻撃対策：ユーザーが存在しない場合でも同等の計算時間を確保
        // bcryptのデフォルトハッシュを使用（Laravelのデフォルトパスワード）
        $dummyHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

        // ユーザーが存在する場合は実際のハッシュ、存在しない場合はダミーハッシュで検証
        $hashToCheck = $user ? $user->password : $dummyHash;
        $isValidPassword = Hash::check($request->password, $hashToCheck);

        if (! $user || ! $isValidPassword) {
            throw ValidationException::withMessages([
                'email' => ['認証情報が正しくありません。'],
            ])->status(422);
        }

        // 既存のトークンを削除（1デバイス1トークン制限）
        $user->tokens()->where('name', $request->device_name)->delete();

        return response()->json([
            'user' => $user,
            'token' => $user->createToken($request->device_name)->plainTextToken,
        ]);
    }

    /**
     * ログアウト処理
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'ログアウトしました。',
        ]);
    }

    /**
     * 現在のユーザー情報取得
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
