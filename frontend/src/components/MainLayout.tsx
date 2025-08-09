import Header from "@/components/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 pt-20">{children}</main>
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 User Management System
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <span className="text-sm text-gray-600 dark:text-gray-400">v1.0.0</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Next.js + Laravel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
