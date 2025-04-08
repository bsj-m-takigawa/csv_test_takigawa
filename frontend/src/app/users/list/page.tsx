"use client";

import { useState, useEffect, Fragment } from "react";
import { fetchUsers } from "../../../lib/api/users";
import Link from "next/link";
import { User } from "../../../lib/api/users";

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        console.log("API response:", data);
        setUsers(data.users || []);
        setError(null);
      } catch (err) {
        setError("ユーザーデータの取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, []);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(users.length / itemsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
  
  if (loading) {
    return <div className="text-center py-10">読み込み中...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ユーザー一覧</h1>
        <Link 
          href="/users/add"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          新規ユーザー追加
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">ID</th>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">名前</th>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">メールアドレス</th>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">電話番号</th>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">会員状態</th>
              <th className="py-2 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-200">操作</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-2 px-4 border-b dark:border-gray-600 text-gray-900 dark:text-gray-100">{user.id}</td>
                  <td className="py-2 px-4 border-b dark:border-gray-600 text-gray-900 dark:text-gray-100">{user.name}</td>
                  <td className="py-2 px-4 border-b dark:border-gray-600 text-gray-900 dark:text-gray-100">{user.email}</td>
                  <td className="py-2 px-4 border-b dark:border-gray-600 text-gray-900 dark:text-gray-100">{user.phone_number || "-"}</td>
                  <td className="py-2 px-4 border-b dark:border-gray-600 text-gray-900 dark:text-gray-100">{user.membership_status || "-"}</td>
                  <td className="py-2 px-4 border-b dark:border-gray-600 space-x-2">
                    <Link 
                      href={`/users/detail/${user.id}`}
                      className="text-blue-500 hover:underline dark:text-blue-400"
                    >
                      詳細
                    </Link>
                    <Link 
                      href={`/users/edit/${user.id}`}
                      className="text-green-500 hover:underline dark:text-green-400"
                    >
                      編集
                    </Link>
                    <Link 
                      href={`/users/delete/${user.id}`}
                      className="text-red-500 hover:underline dark:text-red-400"
                    >
                      削除
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-700 dark:text-gray-200">
                  ユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 改善されたページネーション UI */}
      <div className="flex justify-center mt-4">
        <nav aria-label="ページネーション">
          <ul className="flex space-x-1">
            {/* 最初のページへのリンク */}
            {currentPage > 1 && (
              <li>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-3 py-1 border dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="最初のページ"
                >
                  &laquo;
                </button>
              </li>
            )}
            
            {/* 前のページへのリンク */}
            {currentPage > 1 && (
              <li>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1 border dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="前のページ"
                >
                  &lsaquo;
                </button>
              </li>
            )}
            
            {/* ページ番号 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2)
                );
              })
              .map((page, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsisBefore = index > 0 && prevPage !== page - 1;
                
                return (
                  <Fragment key={page}>
                    {showEllipsisBefore && (
                      <li>
                        <span className="px-3 py-1 border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">...</span>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border dark:border-gray-600 ${
                          currentPage === page
                            ? "bg-blue-500 text-white"
                            : "bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    </li>
                  </Fragment>
                );
              })}
            
            {/* 次のページへのリンク */}
            {currentPage < totalPages && (
              <li>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1 border dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="次のページ"
                >
                  &rsaquo;
                </button>
              </li>
            )}
            
            {/* 最後のページへのリンク */}
            {currentPage < totalPages && (
              <li>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 py-1 border dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="最後のページ"
                >
                  &raquo;
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-300 mt-4">
        全{users.length}件中 {indexOfFirstItem + 1}-
        {indexOfLastItem > users.length ? users.length : indexOfLastItem}件を表示
      </div>
    </div>
  );
}
