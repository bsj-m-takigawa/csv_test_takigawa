/**
 * Fetch APIのユーティリティ関数
 */

import { getAuthHeaders } from './auth';
import { handleAuthError } from './auth-utils';

/**
 * 認証ヘッダー付きのfetchラッパー
 * @param url リクエストURL
 * @param options リクエストオプション
 * @returns レスポンス
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  // 認証エラーの場合は自動的にログインページへリダイレクト
  if (response.status === 401 || response.status === 403) {
    handleAuthError(response.status);
  }

  return response;
}

/**
 * ファイルダウンロード用の共通処理
 * @param blob Blobオブジェクト
 * @param filename ダウンロードファイル名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * エラーレスポンスの処理
 * @param response レスポンスオブジェクト
 * @param customMessage カスタムエラーメッセージ
 */
export async function handleErrorResponse(
  response: Response,
  customMessage?: string
): Promise<never> {
  let errorMessage = customMessage || `HTTP ${response.status}: ${response.statusText}`;
  
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    }
  } catch {
    // JSONパースエラーは無視
  }

  const error = new Error(errorMessage) as Error & {
    response?: { status: number; data: string | null };
  };
  
  error.response = {
    status: response.status,
    data: await response.text().catch(() => null),
  };

  throw error;
}