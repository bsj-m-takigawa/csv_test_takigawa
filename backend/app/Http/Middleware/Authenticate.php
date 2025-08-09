<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // APIリクエストの場合はnullを返す（JSONレスポンスを生成）
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        
        // Webリクエストの場合のみリダイレクト（ただしloginルートは定義されていない）
        return null;
    }
}
