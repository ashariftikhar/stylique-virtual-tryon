import { NextRequest, NextResponse } from 'next/server';
export { POST } from '../auth/login/route';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('store_session');

  if (!sessionCookie?.value) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 },
    );
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({ success: true, store: session });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 },
    );
  }
}
