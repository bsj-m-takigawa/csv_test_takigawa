import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が不要なパス
const publicPaths = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
];

// 認証が必要な操作のパス
const protectedPaths = [
  '/users/add',
  '/users/edit',
  '/users/delete',
  '/users/import',
  '/users/export',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公開パスの場合はそのまま通す
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ホームページとユーザー一覧（読み取り専用）は認証不要
  if (pathname === '/' || pathname === '/users/list' || pathname.startsWith('/users/detail')) {
    return NextResponse.next();
  }

  // 保護されたパスの場合、認証チェック
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    // クッキーまたはヘッダーからトークンを取得
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      // 未認証の場合はログインページへリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};