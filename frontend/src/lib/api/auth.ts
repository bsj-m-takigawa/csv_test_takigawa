const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// 認証トークンの管理
export const AuthToken = {
  get: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  },
  set: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  },
  remove: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  },
};

// 認証ヘッダーを取得
export const getAuthHeaders = (): Record<string, string> => {
  const token = AuthToken.get();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
};

// ログイン
export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      device_name: "web",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "ログインに失敗しました");
  }

  const data = await response.json();
  AuthToken.set(data.token);
  return data;
};

// ログアウト
export const logout = async () => {
  const token = AuthToken.get();
  if (!token) return;

  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    AuthToken.remove();
  }
};

// 現在のユーザー情報を取得
export const getCurrentUser = async () => {
  const token = AuthToken.get();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      AuthToken.remove();
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
};
