export interface ApiResponse<T> {
  data: T;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number;
    to?: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: number;
}

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === "object" && error !== null && "message" in error;
};
