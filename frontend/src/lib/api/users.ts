import { getAuthHeaders } from "./auth";
import { handleAuthError } from "./auth-utils";
import { downloadBlob } from "./fetch-utils";
import type { User } from "@/types/user";
import { ApiResponse, ApiError } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Fetch API helper function with typed response
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = getAuthHeaders();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const baseHeaders: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };

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
    handleAuthError(response.status);
    const errorBody = await response.json().catch(() => ({}));
    const error = Object.assign(
      new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`),
      {
        errors: errorBody.errors,
        code: response.status,
      }
    ) as ApiError & Error;
    throw error;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return response as unknown as T;
}

export const fetchUsers = async (params?: {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  status?: string;
  created?: string;
}): Promise<ApiResponse<User[]>> => {
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
    return await apiFetch<ApiResponse<User[]>>(url);
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const fetchUser = async (id: number): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>(`${API_URL}/users/${id}`);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
};

export const createUser = async (userData: Record<string, unknown>): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>(`${API_URL}/users`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (
  id: number,
  userData: Partial<User>
): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>(`${API_URL}/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<ApiResponse<unknown>> => {
  try {
    return await apiFetch<ApiResponse<unknown>>(`${API_URL}/users/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

export const importUsers = async <T = unknown>(
  file: File,
  importStrategy: "create" | "update" | "skip" = "create"
): Promise<ApiResponse<T>> => {
  try {
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("import_strategy", importStrategy);

    return await apiFetch<ApiResponse<T>>(`${API_URL}/users/import`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("Error importing users:", error);
    throw error;
  }
};

export const exportUsers = async (): Promise<boolean> => {
  try {
    const resp = await apiFetch<Response>(`${API_URL}/users/export`);
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

export const bulkDeleteUsers = async (
  params: BulkOperationParams
): Promise<ApiResponse<unknown>> => {
  try {
    console.log("Bulk delete params:", params); // デバッグ用
    const response = await apiFetch<ApiResponse<unknown>>(`${API_URL}/users/bulk-delete`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response;
  } catch (error: unknown) {
    console.error("Error bulk deleting users:", error);
    throw error;
  }
};

export const bulkExportUsers = async (params: BulkOperationParams): Promise<boolean> => {
  try {
    const resp = await apiFetch<Response>(`${API_URL}/users/bulk-export`, {
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
}): Promise<ApiResponse<Record<string, number>>> => {
  try {
    const searchParams = new URLSearchParams();
    if (params?.q) {
      searchParams.append("q", params.q);
    }
    const queryString = searchParams.toString();
    const url = `${API_URL}/users/status-counts${queryString ? `?${queryString}` : ""}`;

    return await apiFetch<ApiResponse<Record<string, number>>>(url);
  } catch (error) {
    console.error("Error fetching status counts:", error);
    throw error;
  }
};

export const checkDuplicates = async <T = unknown>(file: File): Promise<ApiResponse<T>> => {
  try {
    const formData = new FormData();
    formData.append("csv_file", file);

    return await apiFetch<ApiResponse<T>>(`${API_URL}/users/check-duplicates`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    throw error;
  }
};

export const downloadSampleCSV = async (): Promise<boolean> => {
  try {
    const resp = await apiFetch<Response>(`${API_URL}/users/sample-csv`);
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
