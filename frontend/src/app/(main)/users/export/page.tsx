"use client";

import { useState } from "react";
import Link from "next/link";
import { exportUsers } from "@/lib/api/users";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@/components/ui";

interface ExportStats {
  totalRecords?: number;
  fileSize?: string;
  timestamp?: string;
}

export default function ExportUsersPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setExportStats(null);

      await exportUsers();

      setExportStats({
        timestamp: new Date().toLocaleString("ja-JP"),
      });

      setSuccess("エクスポートが完了しました。ダウンロードが開始されます。");
    } catch (err: unknown) {
      console.error("Error exporting users:", err);
      setError("エクスポートに失敗しました。しばらく待ってから再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">CSVエクスポート</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            全ユーザーデータをCSVファイルとしてダウンロードします
          </p>
        </div>
        <Link href="/users/list">
          <Button variant="outline">
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

      {/* エラーメッセージ */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">エクスポートエラー</p>
              <p>{error}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* 成功メッセージ */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">エクスポート完了</p>
              <p>{success}</p>
              {exportStats && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  完了時刻: {exportStats.timestamp}
                </p>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* メインエクスポートカード */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <CardTitle>データエクスポート</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              登録されているすべてのユーザーデータをCSVファイルとしてダウンロードします。
            </p>
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">
                データ量によってはエクスポートに時間がかかる場合があります
              </span>
            </div>
          </div>

          {/* エクスポートボタン */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={handleExport}
              variant="primary"
              size="lg"
              disabled={loading}
              isLoading={loading}
              className="flex-1 sm:flex-initial"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {loading ? "エクスポート中..." : "CSVをダウンロード"}
            </Button>
          </div>

          {/* エクスポート進行状況 */}
          {loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
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
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">データを処理中...</p>
                  <p className="text-blue-600 dark:text-blue-300">
                    ユーザーデータを取得してCSVファイルを生成しています
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* エクスポートファイル形式の説明 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-500"
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
            <CardTitle className="text-green-600 dark:text-green-400">
              エクスポートファイル形式
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>以下の形式でCSVファイルが生成されます。インポート機能で再度取り込み可能です。</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>列名</TableHead>
                <TableHead>データ形式</TableHead>
                <TableHead>説明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">ID</TableCell>
                <TableCell className="text-sm text-gray-500">数値</TableCell>
                <TableCell className="text-sm">システム内部ID</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">名前</TableCell>
                <TableCell className="text-sm text-gray-500">文字列</TableCell>
                <TableCell className="text-sm">ユーザーの氏名</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">メールアドレス</TableCell>
                <TableCell className="text-sm text-gray-500">メール形式</TableCell>
                <TableCell className="text-sm">連絡先メールアドレス</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">電話番号</TableCell>
                <TableCell className="text-sm text-gray-500">文字列</TableCell>
                <TableCell className="text-sm">連絡先電話番号</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">住所</TableCell>
                <TableCell className="text-sm text-gray-500">文字列</TableCell>
                <TableCell className="text-sm">居住住所</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">生年月日</TableCell>
                <TableCell className="text-sm text-gray-500">YYYY-MM-DD</TableCell>
                <TableCell className="text-sm">生年月日（ISO形式）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">性別</TableCell>
                <TableCell className="text-sm text-gray-500">male/female/other</TableCell>
                <TableCell className="text-sm">性別区分</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">会員状態</TableCell>
                <TableCell className="text-sm text-gray-500">
                  active/inactive/pending/expired
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    アカウント状態
                    <div className="flex gap-1">
                      <Badge variant="success" size="sm">
                        active
                      </Badge>
                      <Badge variant="default" size="sm">
                        inactive
                      </Badge>
                      <Badge variant="warning" size="sm">
                        pending
                      </Badge>
                      <Badge variant="danger" size="sm">
                        expired
                      </Badge>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">メモ</TableCell>
                <TableCell className="text-sm text-gray-500">文字列</TableCell>
                <TableCell className="text-sm">管理用メモ・備考</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">プロフィール画像</TableCell>
                <TableCell className="text-sm text-gray-500">URL</TableCell>
                <TableCell className="text-sm">画像ファイルのパス</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ポイント</TableCell>
                <TableCell className="text-sm text-gray-500">数値</TableCell>
                <TableCell className="text-sm">保有ポイント数</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">最終ログイン</TableCell>
                <TableCell className="text-sm text-gray-500">YYYY-MM-DD HH:MM:SS</TableCell>
                <TableCell className="text-sm">最後にログインした日時</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">作成日</TableCell>
                <TableCell className="text-sm text-gray-500">YYYY-MM-DD HH:MM:SS</TableCell>
                <TableCell className="text-sm">レコード作成日時</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">更新日</TableCell>
                <TableCell className="text-sm text-gray-500">YYYY-MM-DD HH:MM:SS</TableCell>
                <TableCell className="text-sm">最終更新日時</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 追加機能・注意事項 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <CardTitle className="text-gray-600 dark:text-gray-400">使用上の注意</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">ファイル形式</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• UTF-8エンコーディング（BOM付き）</li>
                <li>• Excel対応形式</li>
                <li>• 文字区切り：カンマ（,）</li>
                <li>• 文字囲み：ダブルクォート（&quot;）</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">パフォーマンス</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 大量データは分割処理</li>
                <li>• メモリ効率最適化済み</li>
                <li>• 処理中断時の再試行推奨</li>
                <li>• ネットワーク環境に依存</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  重要な注意事項
                </p>
                <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• エクスポートされたデータには個人情報が含まれています</li>
                  <li>• ファイルの取り扱いには十分ご注意ください</li>
                  <li>• 不要になったファイルは適切に削除してください</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
