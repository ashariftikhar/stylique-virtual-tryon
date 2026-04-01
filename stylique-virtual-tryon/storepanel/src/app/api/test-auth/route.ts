import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    console.log('[test-auth POST] Request received');
    console.log('[test-auth POST] BACKEND_URL:', BACKEND_URL);
    console.log('[test-auth POST] NODE_ENV:', process.env.NODE_ENV);
    
    const body = await request.json();
    console.log('[test-auth POST] Request body:', { store_id: body.store_id, password: '***' });
    
    const { store_id, password } = body;

    if (!store_id || !password) {
      const errorMsg = 'Store ID and password are required';
      console.warn('[test-auth POST] Validation error:', errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    console.log('[test-auth POST] Authenticating store_id:', store_id);
    console.log('[test-auth POST] Calling backend at:', `${BACKEND_URL}/api/auth/login`);

    let backendRes;
    try {
      backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id, password }),
      });
      console.log('[test-auth POST] Backend response status:', backendRes.status);
      console.log('[test-auth POST] Backend response ok:', backendRes.ok);
    } catch (fetchError: any) {
      console.error('[test-auth POST] Fetch error - Failed to connect to backend');
      console.error('[test-auth POST] Fetch error - Code:', fetchError.code);
      console.error('[test-auth POST] Fetch error - Message:', fetchError.message);
      console.error('[test-auth POST] Fetch error - errno:', fetchError.errno);
      console.error('[test-auth POST] Full error object:', JSON.stringify(fetchError, null, 2));
      console.error('[test-auth POST] Full error:', fetchError);
      
      // Check for nested cause (Node.js fetch errors have error.cause)
      const errorCode = fetchError.code || fetchError.cause?.code;
      const errorMessage = fetchError.message || '';
      
      console.error('[test-auth POST] Extracted error code:', errorCode);
      console.error('[test-auth POST] Extracted error message:', errorMessage);
      
      let errorMsg = 'Error connecting to backend';
      if (errorCode === 'ECONNREFUSED') {
        errorMsg = `Backend connection refused - ${BACKEND_URL} (is the backend running?)`;
      } else if (errorCode === 'ENOTFOUND') {
        errorMsg = `Backend host not found - ${BACKEND_URL}`;
      } else if (errorMessage.includes('fetch failed')) {
        errorMsg = `Backend unavailable - ${BACKEND_URL} (network error)`;
      } else {
        errorMsg = `Network error connecting to backend: ${errorMessage}`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMsg,
          code: errorCode,
          backend_url: BACKEND_URL
        },
        { status: 503 },
      );
    }

    let data;
    try {
      data = await backendRes.json();
    } catch (parseError: any) {
      console.error('[test-auth POST] Failed to parse backend response as JSON');
      console.error('[test-auth POST] Parse error:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend returned invalid JSON',
          backend_status: backendRes.status
        },
        { status: 502 },
      );
    }

    console.log('[test-auth POST] Backend response data:', { 
      success: data.success, 
      hasStore: !!data.store,
      hasToken: !!data.token,
      error: data.error 
    });

    if (!backendRes.ok || !data.success) {
      const errorMsg = data.error || 'Authentication failed';
      console.error('[test-auth POST] Backend authentication failed:', errorMsg, 'Status:', backendRes.status);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: backendRes.status || 401 },
      );
    }

    console.log('[test-auth POST] Authentication successful for store_id:', store_id);
    
    const sessionValue = JSON.stringify({
      id: data.store.id,
      store_id: data.store.store_id,
      store_name: data.store.store_name,
      email: data.store.email,
      token: data.token,
    });

    console.log('[test-auth POST] Creating session cookie with store_id:', data.store.store_id);

    const response = NextResponse.json({ 
      success: true, 
      store: data.store,
      token: data.token 
    });

    response.cookies.set('store_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log('[test-auth POST] Session cookie set successfully');
    return response;
  } catch (error: any) {
    console.error('[test-auth POST] Caught exception:', error.message);
    console.error('[test-auth POST] Stack trace:', error.stack);
    
    const errorMessage = error.message || 'Unknown error';
    const errorDetails = error.toString();
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Authentication failed: ${errorMessage}`,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 },
    );
  }
}

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
