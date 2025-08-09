// 認証関連のユーティリティ関数

/**
 * ローカルストレージから認証トークンを取得
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('auth_token');
}

/**
 * 認証ヘッダーを取得
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}

/**
 * ログアウト処理
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    // クッキーも削除
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';
    window.location.href = '/login';
  }
}

/**
 * 認証状態をチェック
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}