<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * セキュリティヘッダーを追加
     *
     * @return mixed
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // セキュリティヘッダーの追加
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Content Security Policy (CSP)
        $csp = "default-src 'self'; ".
               "script-src 'self' 'unsafe-inline' 'unsafe-eval'; ".
               "style-src 'self' 'unsafe-inline'; ".
               "img-src 'self' data: https:; ".
               "font-src 'self' data:; ".
               "connect-src 'self'; ".
               "frame-ancestors 'none';";

        $response->headers->set('Content-Security-Policy', $csp);

        // HTTPS環境でのみStrict-Transport-Securityを設定
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
