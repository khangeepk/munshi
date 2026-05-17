import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  signSessionPayload,
  buildSessionPayload,
  type SessionRole,
} from '@/lib/session-token';

export function attachSessionCookie(
  response: NextResponse,
  user: { id: string; email: string; name: string; role: string },
) {
  const token = signSessionPayload(
    buildSessionPayload({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionRole,
    }),
  );
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
