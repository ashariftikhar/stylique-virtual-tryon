import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Validate if a string is a valid domain name or hostname
 */
function isValidDomain(domain: string): boolean {
  // Basic validation: non-empty, no spaces, looks like a domain
  if (!domain || domain.trim() === '' || domain.includes(' ')) {
    return false;
  }
  // Simple regex for domain validation
  // Allows: example.com, sub.example.com, example.local, localhost, mystore.myshopify.com
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})?$/;
  return domainRegex.test(domain);
}

export async function POST(request: NextRequest) {
  try {
    console.log('[register POST] Request received');
    console.log('[register POST] BACKEND_URL:', BACKEND_URL);

    const body = await request.json();
    console.log('[register POST] Request body:', { 
      store_id: body.store_id, 
      store_name: body.store_name,
      email: body.email,
      password: '***' 
    });

    const { store_id, store_name, email, password } = body;

    // Validation
    if (!store_id || !store_name || !password) {
      const errorMsg = 'Store ID, Store Name, and Password are required';
      console.warn('[register POST] Validation error:', errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    // Validate store_id format (domain name)
    if (!isValidDomain(store_id)) {
      const errorMsg = 'Invalid Store ID. Must be a valid domain name (e.g., mystore.com, store.myshopify.com)';
      console.warn('[register POST] Store ID validation failed:', store_id);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    // Validate store_name length
    if (store_name.trim().length < 2 || store_name.trim().length > 100) {
      const errorMsg = 'Store Name must be between 2 and 100 characters';
      console.warn('[register POST] Store Name validation failed');
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters';
      console.warn('[register POST] Password validation failed');
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const errorMsg = 'Invalid email address';
      console.warn('[register POST] Email validation failed');
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    console.log('[register POST] Registering store_id:', store_id);
    console.log('[register POST] Calling backend at:', `${BACKEND_URL}/api/auth/register`);

    let backendRes;
    try {
      backendRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id, store_name, email: email || null, password }),
      });
      console.log('[register POST] Backend response status:', backendRes.status);
      console.log('[register POST] Backend response ok:', backendRes.ok);
    } catch (fetchError: any) {
      console.error('[register POST] Fetch error - Failed to connect to backend');
      console.error('[register POST] Fetch error - Code:', fetchError.code);
      console.error('[register POST] Fetch error - Message:', fetchError.message);

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
      console.error('[register POST] Failed to parse backend response as JSON');
      return NextResponse.json(
        { success: false, error: 'Backend returned invalid JSON', backend_status: backendRes.status },
        { status: 502 },
      );
    }

    console.log('[register POST] Backend response data:', {
      success: data.success,
      hasStore: !!data.store,
      hasToken: !!data.token,
      error: data.error,
    });

    if (!backendRes.ok || !data.success) {
      const errorMsg = data.error || 'Registration failed';
      console.error('[register POST] Backend registration failed:', errorMsg, 'Status:', backendRes.status);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: backendRes.status || 400 },
      );
    }

    console.log('[register POST] Registration successful for store_id:', store_id);

    // Create session with store info and token
    const sessionValue = JSON.stringify({
      id: data.store.id,
      store_id: data.store.store_id,
      store_name: data.store.store_name,
      email: data.store.email,
      token: data.token,
    });

    console.log('[register POST] Creating session cookie with store_id:', data.store.store_id);

    const response = NextResponse.json({
      success: true,
      store: data.store,
      token: data.token,
      message: 'Registration successful! You are now logged in.',
    });

    // Set session cookie (logging the user in automatically)
    response.cookies.set('store_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log('[register POST] Session cookie set successfully');
    return response;
  } catch (error: any) {
    console.error('[register POST] Caught exception:', error.message);
    console.error('[register POST] Stack trace:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: `Registration failed: ${error.message}`,
        debug: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 },
    );
  }
}
