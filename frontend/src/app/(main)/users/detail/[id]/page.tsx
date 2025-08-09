"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchUser, deleteUser } from "@/lib/api/users";
import { User } from "@/types/user";
import { Button, Card, CardHeader, CardTitle, CardContent, Alert, Badge } from "@/components/ui";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const { data: userData } = await fetchUser(userId);
        setUser(userData);
        setError(null);
      } catch (err) {
        setError("ユーザーデータの取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getGenderLabel = (gender: string | undefined) => {
    switch (gender) {
      case "male":
        return "男性";
      case "female":
        return "女性";
      case "other":
        return "その他";
      default:
        return "-";
    }
  };

  const getMembershipStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Badge variant="success">アクティブ</Badge>;
      case "inactive":
        return <Badge variant="default">非アクティブ</Badge>;
      case "pending":
        return <Badge variant="warning">保留中</Badge>;
      case "expired":
        return <Badge variant="danger">期限切れ</Badge>;
      default:
        return <Badge variant="default">不明</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-gray-600 dark:text-gray-400">ユーザー情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert variant="error">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">データ取得エラー</p>
              <p>{error || "ユーザーが見つかりません"}</p>
            </div>
          </div>
        </Alert>
        <div className="text-center">
          <Link href="/users/list">
            <Button variant="primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              一覧に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">ユーザー詳細</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {user.id} の詳細情報</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/users/edit/${user.id}`}>
            <Button variant="primary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              編集
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            削除
          </Button>
          <Link href="/users/list">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              一覧に戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* ユーザー基本情報カード */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {getMembershipStatusBadge(user.membership_status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  電話番号
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {user.phone_number ? (
                    <a
                      href={`tel:${user.phone_number}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {user.phone_number}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  生年月日
                </dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(user.birth_date)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">性別</dt>
                <dd className="text-gray-900 dark:text-white">{getGenderLabel(user.gender)}</dd>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  ポイント
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {user.points?.toLocaleString() || 0}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">pt</span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  最終ログイン
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {user.last_login_at ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatDateTime(user.last_login_at)}
                    </div>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  登録日
                </dt>
                <dd className="text-gray-900 dark:text-white">{formatDateTime(user.created_at)}</dd>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 住所情報カード */}
      {user.address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              住所
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900 dark:text-white">{user.address}</p>
          </CardContent>
        </Card>
      )}

      {/* メモ・備考カード */}
      {user.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              メモ・備考
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{user.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* システム情報カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            システム情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400 mb-1">ユーザーID</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{user.id}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 mb-1">作成日時</dt>
              <dd className="text-gray-900 dark:text-white">{formatDateTime(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 mb-1">最終更新</dt>
              <dd className="text-gray-900 dark:text-white">{formatDateTime(user.updated_at)}</dd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteUser(userId);
            // 削除成功後、一覧画面へ遷移
            router.push("/users/list");
          } catch (error) {
            console.error("Delete failed:", error);
            alert("削除中にエラーが発生しました");
            setIsDeleting(false);
            setDeleteModalOpen(false);
          }
        }}
        isLoading={isDeleting}
        user={user}
      />
    </div>
  );
}
