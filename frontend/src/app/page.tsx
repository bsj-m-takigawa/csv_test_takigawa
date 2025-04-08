import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">インターン課題 - ユーザー管理アプリ</h1>
      
      <div className="prose">
        <p>
          このアプリケーションは、ユーザーデータのCRUD機能を持つWebアプリケーションです。
          以下の機能を提供しています：
        </p>
        
        <ul>
          <li>ユーザー一覧表示（ページネーション機能付き）</li>
          <li>ユーザー詳細表示</li>
          <li>ユーザー追加</li>
          <li>ユーザー編集</li>
          <li>ユーザー削除</li>
          <li>CSVインポート</li>
          <li>CSVエクスポート</li>
        </ul>
        
        <p>
          このアプリケーションには、いくつかの不具合や改善点があります。
          それらを見つけて修正することが課題です。
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link 
          href="/users/list" 
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
        >
          <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">ユーザー一覧</h5>
          <p className="font-normal text-gray-700">登録されているユーザーの一覧を表示します。</p>
        </Link>
        
        <Link 
          href="/users/add" 
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
        >
          <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">ユーザー追加</h5>
          <p className="font-normal text-gray-700">新しいユーザーを追加します。</p>
        </Link>
        
        <Link 
          href="/users/import" 
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
        >
          <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">CSVインポート</h5>
          <p className="font-normal text-gray-700">CSVファイルからユーザーデータをインポートします。</p>
        </Link>
        
        <Link 
          href="/users/export" 
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
        >
          <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">CSVエクスポート</h5>
          <p className="font-normal text-gray-700">ユーザーデータをCSVファイルにエクスポートします。</p>
        </Link>
      </div>
    </div>
  );
}
