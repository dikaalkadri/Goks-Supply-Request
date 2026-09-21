import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticatedFromRequest } from '@/lib/auth/admin-session';

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* routes EXCEPT /admin itself (PIN login page)
  const isAdminRoute = pathname.startsWith('/admin/');
  const isAdminApiRoute = pathname.startsWith('/api/admin/') && pathname !== '/api/admin/auth';

  if (isAdminRoute || isAdminApiRoute) {
    if (!isAdminAuthenticatedFromRequest(req)) {
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+', '/api/admin/:path*'],
};
