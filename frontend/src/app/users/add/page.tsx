"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUser } from "../../../lib/api/users";

export default function AddUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
    {},
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone_number: "",
    address: "",
    birth_date: "",
    gender: "",
    membership_status: "pending",
    notes: "",
    points: "0",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      setError("名前は必須です。");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setServerErrors({});

      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        phone_number: formData.phone_number || undefined,
        address: formData.address || undefined,
        birth_date: formData.birth_date || undefined,
        gender:
          (formData.gender as "" | "male" | "female" | "other") || undefined,
        membership_status:
          (formData.membership_status as
            | ""
            | "active"
            | "inactive"
            | "pending"
            | "expired") || undefined,
        notes: formData.notes || undefined,
      } as Record<string, unknown>;

      await createUser(userData);
      router.push("/users/list");
    } catch (err: unknown) {
      console.error("Error creating user:", err);

      const resp = (
        err as { response?: { data?: { errors?: Record<string, string[]> } } }
      ).response;
      if (resp && resp.data && resp.data.errors) {
        setServerErrors(resp.data.errors as Record<string, string[]>);
        setError("入力内容に問題があります。");
      } else {
        setError("ユーザー登録に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ユーザー追加</h1>
        <Link
          href="/users/list"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          一覧に戻る
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="name"
          >
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border ${serverErrors.name ? "border-red-500" : ""} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
            id="name"
            type="text"
            name="name"
            placeholder="山田 太郎"
            value={formData.name}
            onChange={handleChange}
          />
          {serverErrors.name && (
            <p className="text-red-500 text-xs italic">
              {serverErrors.name[0]}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="email"
          >
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border ${serverErrors.email ? "border-red-500" : ""} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
            id="email"
            type="text"
            name="email"
            placeholder="taro@example.com"
            value={formData.email}
            onChange={handleChange}
          />
          {serverErrors.email && (
            <p className="text-red-500 text-xs italic">
              {serverErrors.email[0]}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="password"
          >
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border ${serverErrors.password ? "border-red-500" : ""} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
            id="password"
            type="password"
            name="password"
            placeholder="8文字以上"
            value={formData.password}
            onChange={handleChange}
          />
          {serverErrors.password && (
            <p className="text-red-500 text-xs italic">
              {serverErrors.password[0]}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="password_confirmation"
          >
            パスワード(確認) <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border ${serverErrors.password_confirmation ? "border-red-500" : ""} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
            id="password_confirmation"
            type="password"
            name="password_confirmation"
            placeholder="もう一度同じパスワード"
            value={formData.password_confirmation}
            onChange={handleChange}
          />
          {serverErrors.password_confirmation && (
            <p className="text-red-500 text-xs italic">
              {serverErrors.password_confirmation[0]}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="phone_number"
          >
            電話番号
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="phone_number"
            type="text"
            name="phone_number"
            placeholder="090-1234-5678"
            value={formData.phone_number}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="address"
          >
            住所
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="address"
            type="text"
            name="address"
            placeholder="東京都〇〇区〇〇1-2-3"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="birth_date"
          >
            生年月日
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="birth_date"
            type="date"
            name="birth_date"
            placeholder="YYYY-MM-DD"
            value={formData.birth_date}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="gender"
          >
            性別
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">選択してください</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="membership_status"
          >
            会員状態
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="membership_status"
            name="membership_status"
            value={formData.membership_status}
            onChange={handleChange}
          >
            <option value="pending">保留中</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
            <option value="expired">期限切れ</option>
          </select>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="points"
          >
            ポイント
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="points"
            type="number"
            name="points"
            value={formData.points}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="notes"
          >
            メモ
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="notes"
            name="notes"
            rows={4}
            placeholder="自由入力（最大2000文字）"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? "処理中..." : "登録する"}
          </button>
        </div>
      </form>
    </div>
  );
}
