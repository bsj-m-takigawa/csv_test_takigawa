<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CompressResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // APIリクエストの場合のみ圧縮対象
        if (! $request->is('api/*')) {
            return $response;
        }

        // クライアントがgzip圧縮をサポートしているかチェック
        $acceptEncoding = $request->header('Accept-Encoding', '');
        if (! str_contains(strtolower($acceptEncoding), 'gzip')) {
            return $response;
        }

        // レスポンスの内容を取得
        $content = $response->getContent();

        // 空のコンテンツや既に圧縮済みの場合はスキップ
        if (empty($content) || $response->headers->has('Content-Encoding')) {
            return $response;
        }

        // コンテンツタイプチェック（JSON, CSV, テキストのみ圧縮）
        $contentType = $response->headers->get('Content-Type', '');
        $compressibleTypes = [
            'application/json',
            'text/csv',
            'text/plain',
            'application/csv',
        ];

        $shouldCompress = false;
        foreach ($compressibleTypes as $type) {
            if (str_contains($contentType, $type)) {
                $shouldCompress = true;
                break;
            }
        }

        if (! $shouldCompress) {
            return $response;
        }

        // 1KB以上の場合のみ圧縮（小さいファイルは圧縮効果が低い）
        if (strlen($content) < 1024) {
            return $response;
        }

        // gzip圧縮実行
        $compressedContent = gzencode($content, 6); // レベル6（バランス重視）

        if ($compressedContent === false) {
            return $response; // 圧縮失敗時は元のレスポンスを返す
        }

        // 圧縮効果チェック（圧縮後の方が大きい場合はスキップ）
        if (strlen($compressedContent) >= strlen($content)) {
            return $response;
        }

        // 圧縮されたコンテンツとヘッダーを設定
        $response->setContent($compressedContent);
        $response->headers->set('Content-Encoding', 'gzip');
        $response->headers->set('Vary', 'Accept-Encoding');
        $response->headers->set('Content-Length', strlen($compressedContent));

        // ログ出力（デバッグ用）
        if (config('app.debug')) {
            $originalSize = strlen($content);
            $compressedSize = strlen($compressedContent);
            $ratio = round((1 - $compressedSize / $originalSize) * 100, 1);

            \Log::info('Response compressed', [
                'original_size' => $originalSize,
                'compressed_size' => $compressedSize,
                'compression_ratio' => $ratio.'%',
                'content_type' => $contentType,
                'path' => $request->path(),
            ]);
        }

        return $response;
    }
}
