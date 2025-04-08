import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "インターン課題 - ユーザー管理アプリ",
  description: "ユーザーデータのCRUD機能を持つWebアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="bg-slate-800 text-white p-4">
            <div className="container mx-auto">
              <h1 className="text-2xl font-bold">ユーザー管理アプリ</h1>
              <nav className="mt-2">
                <ul className="flex space-x-4">
                  <li>
                    <Link href="/" className="hover:underline">
                      ホーム
                    </Link>
                  </li>
                  <li>
                    <Link href="/users/list" className="hover:underline">
                      ユーザー一覧
                    </Link>
                  </li>
                  <li>
                    <Link href="/users/add" className="hover:underline">
                      ユーザー追加
                    </Link>
                  </li>
                  <li>
                    <Link href="/users/import" className="hover:underline">
                      CSVインポート
                    </Link>
                  </li>
                  <li>
                    <Link href="/users/export" className="hover:underline">
                      CSVエクスポート
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>
          <footer className="bg-slate-800 text-white p-4">
            <div className="container mx-auto text-center">
              <p>インターン課題 - ユーザー管理アプリ</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
