// 認証関連のユーティリティ関数

/**
 * セッションストレージから認証トークンを取得
 * XSS攻撃のリスク軽減のためlocalStorageではなくsessionStorageを使用
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem("auth_token");
}

/**
 * 認証ヘッダーを取得
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}

/**
 * ログアウト処理
 */
export function logout(): void {
  if (typeof window !== "undefined") {
    // セッションストレージからトークンを削除
    sessionStorage.removeItem("auth_token");

    // クッキーも削除（SameSiteをLaxに変更してナビゲーション互換性を改善）
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

    // キャッシュをクリアしてから強制的にリダイレクト
    // これによりブラウザバックで古いページが表示されるのを防ぐ
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // 履歴を置き換えてからリダイレクト（ブラウザバックを防ぐ）
    window.location.replace("/login");
  }
}

/**
 * 認証状態をチェック
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
