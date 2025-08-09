import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証が不要なパス（システム関連とログインページのみ）
const publicPaths = ["/login", "/api/auth", "/_next", "/favicon.ico", "/manifest.json", "/sw.js"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスの場合はそのまま通す
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ホームページのみ認証不要（ランディングページとして）
  if (pathname === "/") {
    return NextResponse.next();
  }

  // それ以外の全てのページ（ユーザー一覧、詳細、編集など）は認証必須
  // PII保護のため、ユーザー情報の閲覧も認証が必要
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // 未認証の場合はログインページへリダイレクト
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // URL Injection対策: パス名のみを保存（クエリパラメータは除外）
    url.searchParams.set("returnUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(url);
  }

  // トークンの基本的な検証（英数字とハイフン、アンダースコア、ピリオドを許可）
  // Laravel Sanctumのトークンは通常、数字とハイフンを含む
  const tokenPattern = /^[A-Za-z0-9\-_.|]+$/;
  if (!tokenPattern.test(token) || token.length < 20) {
    // 不正なトークンの場合もログインページへ
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // キャッシュ制御ヘッダーを追加してブラウザバック時の問題を防ぐ
  const response = NextResponse.next();

  // 認証が必要なページはキャッシュしない
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

  return response;
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
