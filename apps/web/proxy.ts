import { type NextRequest, NextResponse } from 'next/server';

const X_CLICK_ID_COOKIE = 'uk_twclid';
const X_CLICK_ID_PATTERN = /^[A-Za-z0-9._-]{1,256}$/;
const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90;

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const twclid = request.nextUrl.searchParams.get('twclid');

  if (!twclid || !X_CLICK_ID_PATTERN.test(twclid)) {
    return response;
  }

  const hostname = request.nextUrl.hostname;
  const isUploadKitDomain =
    hostname === 'uploadkit.dev' || hostname.endsWith('.uploadkit.dev');

  response.cookies.set(X_CLICK_ID_COOKIE, twclid, {
    ...(isUploadKitDomain ? { domain: '.uploadkit.dev' } : {}),
    httpOnly: true,
    maxAge: NINETY_DAYS_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: isUploadKitDomain,
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
