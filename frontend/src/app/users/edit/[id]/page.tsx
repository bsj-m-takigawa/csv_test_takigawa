"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchUser, updateUser, User } from "../../../../lib/api/users";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert, Select, Textarea } from "@/components/ui";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    address: "",
    birth_date: "",
    gender: "",
    membership_status: "",
    notes: "",
    points: "0",
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userData = await fetchUser(userId);

        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          phone_number: userData.phone_number || "",
          address: userData.address || "",
          birth_date: userData.birth_date || "",
          gender: userData.gender || "",
          membership_status: userData.membership_status || "",
          notes: userData.notes || "",
          points: userData.points?.toString() || "0",
        });

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // 生年月日の場合は日付の妥当性をチェック
    if (name === 'birth_date' && value) {
      const inputDate = new Date(value);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      
      // 日付が有効範囲外の場合は更新しない
      if (inputDate < minDate || inputDate > today) {
        return;
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      setError("名前は必須です。");
      return;
    }

    // 生年月日のバリデーション
    if (formData.birth_date) {
      const inputDate = new Date(formData.birth_date);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      
      if (inputDate < minDate || inputDate > today) {
        setError("生年月日は1900年以降、今日までの日付を入力してください。");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      setServerErrors({});

      const userData = {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number || undefined,
        address: formData.address || undefined,
        birth_date: formData.birth_date || undefined,
        gender: (formData.gender as "" | "male" | "female" | "other") || undefined,
        membership_status:
          (formData.membership_status as "" | "active" | "inactive" | "pending" | "expired") ||
          undefined,
        notes: formData.notes || undefined,
        points: formData.points ? parseInt(formData.points) : undefined,
      } as Partial<User>;

      await updateUser(userId, userData);
      router.push(`/users/detail/${userId}`);
    } catch (err: unknown) {
      console.error("Error updating user:", err);

      const resp = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        .response;
      if (resp && resp.data && resp.data.errors) {
        setServerErrors(resp.data.errors as Record<string, string[]>);
        setError("入力内容に問題があります。");
      } else {
        setError("ユーザー更新に失敗しました。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 dark:text-gray-400">ユーザー情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">ユーザー編集</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            ユーザー情報を編集してください
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/users/detail/${userId}`}>
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              詳細に戻る
            </Button>
          </Link>
          <Link href="/users/list">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              一覧に戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">更新エラー</p>
              <p>{error}</p>
            </div>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 名前 */}
            <div className="space-y-2">
              <Input
                label="名前"
                id="name"
                type="text"
                name="name"
                placeholder="山田 太郎"
                value={formData.name}
                onChange={handleChange}
                required
                error={serverErrors.name?.[0]}
              />
            </div>

            {/* メールアドレス */}
            <div className="space-y-2">
              <Input
                label="メールアドレス"
                id="email"
                type="email"
                name="email"
                placeholder="taro@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                error={serverErrors.email?.[0]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>連絡先情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 電話番号と住所 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  label="電話番号"
                  id="phone_number"
                  type="tel"
                  name="phone_number"
                  placeholder="090-1234-5678"
                  value={formData.phone_number}
                  onChange={handleChange}
                  helperText="ハイフンありなしどちらでもOK"
                />
              </div>
              <div className="space-y-2">
                <Input
                  label="住所"
                  id="address"
                  type="text"
                  name="address"
                  placeholder="東京都渋谷区神宮前1-2-3"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>個人情報・会員設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 生年月日と性別 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  label="生年月日"
                  id="birth_date"
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  helperText="1900年以降、今日までの日付を選択してください"
                />
              </div>
              <div className="space-y-2">
                <Select
                  label="性別"
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  placeholder="選択してください"
                  options={[
                    { value: "male", label: "男性" },
                    { value: "female", label: "女性" },
                    { value: "other", label: "その他" },
                  ]}
                />
              </div>
            </div>
            
            {/* 会員状態とポイント */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select
                  label="会員状態"
                  id="membership_status"
                  name="membership_status"
                  value={formData.membership_status}
                  onChange={handleChange}
                  options={[
                    { value: "pending", label: "保留中" },
                    { value: "active", label: "アクティブ" },
                    { value: "inactive", label: "非アクティブ" },
                    { value: "expired", label: "期限切れ" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Input
                  label="ポイント"
                  id="points"
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleChange}
                  min="0"
                  helperText="0以上の整数で入力"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* メモ */}
            <div className="space-y-2">
              <Textarea
                label="メモ・備考"
                id="notes"
                name="notes"
                rows={4}
                placeholder="自由入力（最大2000文字）"
                value={formData.notes}
                onChange={handleChange}
                maxLength={2000}
                helperText={`${formData.notes.length}/2000文字`}
              />
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            isLoading={submitting}
            className="flex-1 sm:flex-initial"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {submitting ? "更新中..." : "変更を保存"}
          </Button>
          <Link href={`/users/detail/${userId}`}>
            <Button
              variant="outline"
              size="lg"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}