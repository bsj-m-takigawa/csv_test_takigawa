import { getAuthHeaders } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  address?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  membership_status?: "active" | "inactive" | "pending" | "expired";
  notes?: string;
  profile_image?: string;
  points?: number;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch API helper function
async function apiFetch(url: string, options: RequestInit = {}) {
  const authHeaders = getAuthHeaders();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(options.headers as Record<string, string> || {}),
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // 認証エラーの場合はログインページへリダイレクト
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        // 現在のURLを保存してログイン後に戻れるようにする
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
        // リダイレクト中は処理を停止
        return new Promise(() => {});
      }
    }
    
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as Error & { response?: { status: number; data: string | null } }).response = {
      status: response.status,
      data: await response.text().catch(() => null),
    };
    throw error;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response;
}

export const fetchUsers = async (params?: {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  status?: string;
  created?: string;
}) => {
  try {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    const url = `${API_URL}/users${queryString ? `?${queryString}` : ""}`;

    return await apiFetch(url);
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const fetchUser = async (id: number) => {
  try {
    return await apiFetch(`${API_URL}/users/${id}`);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
};

export const createUser = async (userData: Record<string, unknown>) => {
  try {
    return await apiFetch(`${API_URL}/users`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (id: number, userData: Partial<User>) => {
  try {
    return await apiFetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
};

export const deleteUser = async (id: number) => {
  try {
    return await apiFetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

export const importUsers = async (
  file: File,
  importStrategy: "create" | "update" | "skip" = "create"
) => {
  try {
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("import_strategy", importStrategy);

    const response = await fetch(`${API_URL}/users/import`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => null);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as Error & { response?: { status: number; data: string | null } }).response = {
        status: response.status,
        data: errorText,
      };
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error("Error importing users:", error);

    // 詳細エラー情報をログ出力
    if (error && typeof error === "object" && "response" in error) {
      const errorWithResponse = error as { response?: { status?: number; data?: unknown } };
      console.error("Response status:", errorWithResponse.response?.status);
      console.error("Response data:", errorWithResponse.response?.data);

      // エラーレスポンスに詳細情報を含める
      const enhancedError = {
        message: error instanceof Error ? error.message : "Unknown error",
        details: errorWithResponse.response?.data || null,
        status: errorWithResponse.response?.status || null,
        response: errorWithResponse.response,
      };

      throw enhancedError;
    }

    throw error;
  }
};

export const exportUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users/export`);

    if (!response.ok) {
      // 認証エラーの場合はログインページへリダイレクト
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?returnUrl=${returnUrl}`;
          return false;
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `users_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    console.error("Error exporting users:", error);
    throw error;
  }
};

// バルク操作の型定義
export interface BulkOperationParams {
  user_ids?: number[];
  select_all?: boolean;
  select_type?: "all" | "filtered";
  filters?: {
    q?: string;
    status?: string;
    created?: string;
  };
}

export const bulkDeleteUsers = async (params: BulkOperationParams) => {
  try {
    console.log("Bulk delete params:", params); // デバッグ用

    // apiFetchヘルパーを使用して認証ヘッダーを自動付与
    const response = await apiFetch(`${API_URL}/users/bulk-delete`, {
      method: "POST",
      body: JSON.stringify(params),
    });

    // apiFetchがエラーハンドリングを行うため、直接レスポンスを返す
    return response;
  } catch (error: unknown) {
    console.error("Error bulk deleting users:", error);
    throw error;
  }
};

export const bulkExportUsers = async (params: BulkOperationParams) => {
  try {
    // 認証ヘッダーを含むfetchを直接使用（blobレスポンスのため）
    const authHeaders = getAuthHeaders();
    const response = await fetch(`${API_URL}/users/bulk-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // 認証エラーの場合はログインページへリダイレクト
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?returnUrl=${returnUrl}`;
          return false;
        }
      }
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // ファイル名をContent-Dispositionヘッダーから取得（可能な場合）
    const contentDisposition = response.headers.get("content-disposition");
    let filename = "bulk_export.csv";
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="([^"]+)"/);
      if (matches) {
        filename = matches[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error: unknown) {
    console.error("Error bulk exporting users:", error);
    throw error;
  }
};

export const fetchStatusCounts = async (params?: {
  q?: string;
}): Promise<Record<string, number>> => {
  try {
    const searchParams = new URLSearchParams();
    if (params?.q) {
      searchParams.append("q", params.q);
    }
    const queryString = searchParams.toString();
    const url = `${API_URL}/users/status-counts${queryString ? `?${queryString}` : ""}`;

    return await apiFetch(url);
  } catch (error) {
    console.error("Error fetching status counts:", error);
    throw error;
  }
};

export const checkDuplicates = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("csv_file", file);

    // 認証ヘッダーを追加（ファイルアップロードのためContent-Typeは設定しない）
    const authHeaders = getAuthHeaders();
    const response = await fetch(`${API_URL}/users/check-duplicates`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => null);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as Error & { response?: { status: number; data: string | null } }).response = {
        status: response.status,
        data: errorText,
      };
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error("Error checking duplicates:", error);

    if (error && typeof error === "object" && "response" in error) {
      const errorWithResponse = error as { response?: { status?: number; data?: unknown } };
      console.error("Response status:", errorWithResponse.response?.status);
      console.error("Response data:", errorWithResponse.response?.data);

      const enhancedError = {
        message: error instanceof Error ? error.message : "Unknown error",
        details: errorWithResponse.response?.data || null,
        status: errorWithResponse.response?.status || null,
        response: errorWithResponse.response,
      };

      throw enhancedError;
    }

    throw error;
  }
};

export const downloadSampleCSV = async () => {
  try {
    const response = await fetch(`${API_URL}/users/sample-csv`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_users.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    console.error("Error downloading sample CSV:", error);
    throw error;
  }
};
