import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    console.log('[auth/login POST] Request received');
    console.log('[auth/login POST] BACKEND_URL:', BACKEND_URL);

    const body = await request.json();
    console.log('[auth/login POST] Request body:', {
      store_id: body.store_id,
      password: '***',
    });

    const { store_id, password } = body;

    // Validation
    if (!store_id || !password) {
      const errorMsg = 'Store ID and Password are required';
      console.warn('[auth/login POST] Validation error:', errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    console.log('[auth/login POST] Logging in store_id:', store_id);
    console.log('[auth/login POST] Calling backend at:', `${BACKEND_URL}/api/auth/login`);

    let backendRes;
    try {
      backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id, password }),
      });
      console.log('[auth/login POST] Backend response status:', backendRes.status);
      console.log('[auth/login POST] Backend response ok:', backendRes.ok);
    } catch (fetchError: any) {
      console.error('[auth/login POST] Fetch error - Failed to connect to backend');
      console.error('[auth/login POST] Fetch error - Code:', fetchError.code);
      console.error('[auth/login POST] Fetch error - Message:', fetchError.message);

      let errorMsg = 'Error connecting to backend';
      if (fetchError.code === 'ECONNREFUSED') {
        errorMsg = `Backend connection refused - ${BACKEND_URL} (is the backend running?)`;
      } else if (fetchError.code === 'ENOTFOUND') {
        errorMsg = `Backend host not found - ${BACKEND_URL}`;
      } else if (fetchError.message?.includes('fetch failed')) {
        errorMsg = `Backend unavailable - ${BACKEND_URL} (network error)`;
      }

      return NextResponse.json(
        { success: false, error: errorMsg, backend_url: BACKEND_URL },
        { status: 503 },
      );
    }

    let data;
    try {
      data = await backendRes.json();
    } catch (parseError: any) {
      console.error('[auth/login POST] Failed to parse backend response as JSON');
      return NextResponse.json(
        { success: false, error: 'Backend returned invalid JSON', backend_status: backendRes.status },
        { status: 502 },
      );
    }

    console.log('[auth/login POST] Backend response data:', {
      success: data.success,
      hasStore: !!data.store,
      hasToken: !!data.token,
      error: data.error,
    });

    if (!backendRes.ok || !data.success) {
      const errorMsg = data.error || 'Login failed';
      console.error('[auth/login POST] Backend login failed:', errorMsg, 'Status:', backendRes.status);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: backendRes.status || 400 },
      );
    }

    console.log('[auth/login POST] Login successful for store_id:', store_id);

    // Create session with store info and token
    const sessionValue = JSON.stringify({
      id: data.store.id,
      store_id: data.store.store_id,
      store_name: data.store.store_name,
      email: data.store.email,
      token: data.token,
    });

    console.log('[auth/login POST] Creating session cookie with store_id:', data.store.store_id);

    const response = NextResponse.json({
      success: true,
      store: data.store,
      token: data.token,
      message: 'Login successful',
    });

    // Set session cookie
    response.cookies.set('store_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log('[auth/login POST] Session cookie set successfully');
    return response;
  } catch (error: any) {
    console.error('[auth/login POST] Caught exception:', error.message);
    console.error('[auth/login POST] Stack trace:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: `Login failed: ${error.message}`,
        debug: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 },
    );
  }
}
