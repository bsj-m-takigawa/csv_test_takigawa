import { getAuthHeaders } from "./auth";
import { handleAuthError } from "./auth-utils";
import { downloadBlob } from "./fetch-utils";

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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const baseHeaders: HeadersInit = isFormData
    ? {} // FormData の場合は Content-Type を自動付与させる
    : { "Content-Type": "application/json" };

  const headers: HeadersInit = {
    ...baseHeaders,
    ...authHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // 認証エラーの場合はログインページへリダイレクト
    handleAuthError(response.status);

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

    // apiFetch で認証・エラー処理を統一
    return await apiFetch(`${API_URL}/users/import`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("Error importing users:", error);
    throw error;
  }
};

export const exportUsers = async () => {
  try {
    const resp = await apiFetch(`${API_URL}/users/export`);
    if (resp instanceof Response) {
      const blob = await resp.blob();
      downloadBlob(blob, `users_${new Date().toISOString()}.csv`);
      return true;
    }
    throw new Error("Unexpected response type for export");
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
    const resp = await apiFetch(`${API_URL}/users/bulk-export`, {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (resp instanceof Response) {
      const blob = await resp.blob();
      const contentDisposition = resp.headers.get("content-disposition");
      let filename = "bulk_export.csv";
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename=\"([^\"]+)\"/);
        if (matches) {
          filename = matches[1];
        }
      }
      downloadBlob(blob, filename);
      return true;
    }
    throw new Error("Unexpected response type for bulk export");
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

    return await apiFetch(`${API_URL}/users/check-duplicates`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    throw error;
  }
};

export const downloadSampleCSV = async () => {
  try {
    const resp = await apiFetch(`${API_URL}/users/sample-csv`);
    if (resp instanceof Response) {
      const blob = await resp.blob();
      downloadBlob(blob, "sample_users.csv");
      return true;
    }
    throw new Error("Unexpected response type for sample CSV");
  } catch (error) {
    console.error("Error downloading sample CSV:", error);
    throw error;
  }
};
