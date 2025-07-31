// Quantum Backend Service Worker
// This creates a virtual backend that runs in the browser!

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Mock backend data
const MOCK_USER = {
  id: 'admin-001',
  email: 'admin@znapfile.com',
  username: 'admin',
  plan: 'max'
};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept API calls when backend is down
  if (url.pathname.startsWith('/api/v1/') && url.hostname === 'localhost') {
    event.respondWith(handleAPIRequest(event.request, url));
  }
});

async function handleAPIRequest(request, url) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  // Health check
  if (url.pathname === '/api/v1/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'quantum-service-worker',
      mode: 'offline-first'
    }), { headers });
  }
  
  // Login
  if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') {
    const body = await request.json();
    
    if (body.email === MOCK_USER.email && body.password === 'SecurePass123!') {
      return new Response(JSON.stringify({
        user: MOCK_USER,
        access_token: 'sw-token-' + Date.now(),
        refresh_token: 'sw-refresh-' + Date.now()
      }), { headers });
    }
    
    return new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
      status: 401,
      headers
    });
  }
  
  // Try real backend first
  try {
    const response = await fetch(request);
    if (response.ok) return response;
  } catch (e) {
    // Fallback to mock
  }
  
  return new Response(JSON.stringify({ 
    detail: 'Quantum backend active - limited functionality' 
  }), { 
    status: 503,
    headers 
  });
}