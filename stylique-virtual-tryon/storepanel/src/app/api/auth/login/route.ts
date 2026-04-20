import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

type BackendStore = {
  id: string;
  store_id: string;
  store_name: string;
  email?: string;
};

type BackendAuthResponse = {
  success?: boolean;
  store?: BackendStore;
  token?: string;
  error?: string;
};

function backendConnectionMessage(error: unknown) {
  const details = error as { code?: string; cause?: { code?: string }; message?: string };
  const code = details.code || details.cause?.code;
  const message = details.message || '';

  if (code === 'ECONNREFUSED') return `Backend connection refused - ${BACKEND_URL}`;
  if (code === 'ENOTFOUND') return `Backend host not found - ${BACKEND_URL}`;
  if (message.includes('fetch failed')) return `Backend unavailable - ${BACKEND_URL}`;
  return 'Error connecting to backend';
}

function createSessionResponse(data: BackendAuthResponse) {
  if (!data.store || !data.token) {
    return NextResponse.json(
      { success: false, error: 'Backend returned an incomplete login response' },
      { status: 502 },
    );
  }

  const sessionValue = JSON.stringify({
    id: data.store.id,
    store_id: data.store.store_id,
    store_name: data.store.store_name,
    email: data.store.email,
    token: data.token,
  });

  const response = NextResponse.json({
    success: true,
    store: data.store,
    token: data.token,
    message: 'Login successful',
  });

  response.cookies.set('store_session', sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { store_id?: string; password?: string };
    const { store_id, password } = body;

    if (!store_id || !password) {
      return NextResponse.json(
        { success: false, error: 'Store ID and Password are required' },
        { status: 400 },
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id, password }),
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: backendConnectionMessage(error), backend_url: BACKEND_URL },
        { status: 503 },
      );
    }

    let data: BackendAuthResponse;
    try {
      data = (await backendRes.json()) as BackendAuthResponse;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Backend returned invalid JSON', backend_status: backendRes.status },
        { status: 502 },
      );
    }

    if (!backendRes.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Login failed' },
        { status: backendRes.status || 400 },
      );
    }

    return createSessionResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Login failed: ${message}`,
        debug: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
