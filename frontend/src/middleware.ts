import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が不要なパス（システム関連とログインページのみ）
const publicPaths = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公開パスの場合はそのまま通す
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ホームページのみ認証不要（ランディングページとして）
  if (pathname === '/') {
    return NextResponse.next();
  }

  // それ以外の全てのページ（ユーザー一覧、詳細、編集など）は認証必須
  // PII保護のため、ユーザー情報の閲覧も認証が必要
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    // 未認証の場合はログインページへリダイレクト
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
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