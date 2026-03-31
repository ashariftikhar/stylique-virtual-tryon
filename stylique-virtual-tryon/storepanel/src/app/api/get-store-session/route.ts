import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('store_session');

  if (!sessionCookie?.value) {
    return NextResponse.json({
      authenticated: false,
      store: null,
    });
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    if (!session.id || !session.store_id) {
      return NextResponse.json({
        authenticated: false,
        store: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      store: {
        id: session.id,
        store_id: session.store_id,
        store_name: session.store_name,
        email: session.email,
      },
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      store: null,
    });
  }
}
