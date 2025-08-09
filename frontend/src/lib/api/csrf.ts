/**
 * CSRF保護のためのトークン管理
 */

let csrfToken: string | null = null;

/**
 * CSRFトークンを取得
 * @returns CSRFトークン
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    // Laravel Sanctumの場合、/sanctum/csrf-cookieエンドポイントからトークンを取得
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });

    if (response.ok) {
      // クッキーからXSRF-TOKENを取得
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
          csrfToken = decodeURIComponent(value);
          return csrfToken;
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }

  return '';
}

/**
 * CSRFトークンをヘッダーに追加
 * @param headers 既存のヘッダー
 * @returns CSRFトークンを含むヘッダー
 */
export async function addCsrfHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCsrfToken();
  
  if (token) {
    return {
      ...headers,
      'X-XSRF-TOKEN': token,
    };
  }
  
  return headers;
}