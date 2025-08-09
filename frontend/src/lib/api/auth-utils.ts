/**
 * 認証関連のユーティリティ関数
 */

/**
 * リダイレクトURLの安全性を検証
 * @param url 検証するURL
 * @returns 安全な場合はtrue
 */
export function isValidReturnUrl(url: string): boolean {
  if (!url) return false;
  
  // 相対パスのみ許可（絶対URLやプロトコル相対URLは拒否）
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return false;
  }
  
  // パスは'/'で始まる必要がある
  if (!url.startsWith('/')) {
    return false;
  }
  
  // 危険な文字列のチェック
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    '<script',
    '%3Cscript',
  ];
  
  const lowerUrl = url.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerUrl.includes(pattern)) {
      return false;
    }
  }
  
  return true;
}

/**
 * 安全なリダイレクトを実行
 * @param url リダイレクト先URL
 * @param fallback フォールバックURL（デフォルト: '/'）
 */
export function safeRedirect(url: string, fallback: string = '/'): void {
  const decodedUrl = decodeURIComponent(url);
  
  if (isValidReturnUrl(decodedUrl)) {
    window.location.href = decodedUrl;
  } else {
    console.warn('Invalid redirect URL detected, redirecting to fallback:', url);
    window.location.href = fallback;
  }
}

/**
 * 認証エラーハンドリング
 * @param status HTTPステータスコード
 * @param currentPath 現在のパス
 */
export function handleAuthError(status: number, currentPath?: string): void {
  if (status === 401 || status === 403) {
    if (typeof window !== 'undefined') {
      const returnUrl = currentPath || window.location.pathname;
      const encodedUrl = encodeURIComponent(returnUrl);
      window.location.href = `/login?returnUrl=${encodedUrl}`;
    }
  }
}