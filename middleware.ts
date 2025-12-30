import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/:path*',
};

export function middleware(req: NextRequest) {
  // If we are on localhost, skip auth so development is easy
  if (req.nextUrl.hostname === 'localhost') {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  // CHANGE THESE TO YOUR PREFERRED LOGIN
  const user = 'itsme';
  const pwd = 'nope';

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [u, p] = atob(authValue).split(':');

    if (u === user && p === pwd) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}