// Service Worker - Virtual Backend for GitHub Pages
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));

// Mock backend responses
const MOCK_RESPONSES = {
  '/api/v1/health': {
    status: 'ok',
    service: 'github-pages-sw',
    timestamp: new Date().toISOString()
  },
  '/api/v1/auth/login': {
    handler: async (request) => {
      const body = await request.json();
      if (body.email === 'admin@znapfile.com' && body.password === 'SecurePass123!') {
        return {
          user: {
            id: 'admin-001',
            email: 'admin@znapfile.com',
            username: 'admin',
            plan: 'max'
          },
          access_token: 'sw-' + Date.now(),
          refresh_token: 'sw-refresh-' + Date.now()
        };
      }
      throw new Error('Invalid credentials');
    }
  }
};

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle API requests
  if (!url.pathname.startsWith('/api/')) return;
  
  event.respondWith(handleAPIRequest(event.request, url));
});

async function handleAPIRequest(request, url) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // Check for mock handler
  const mock = MOCK_RESPONSES[url.pathname];
  
  if (mock) {
    try {
      const data = mock.handler ? await mock.handler(request) : mock;
      return new Response(JSON.stringify(data), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ detail: error.message }), {
        status: 401,
        headers
      });
    }
  }
  
  // Try to fetch from GitHub Pages JSON files
  try {
    const jsonPath = url.pathname.replace('/api/v1', '/api') + '.json';
    const response = await fetch(jsonPath);
    if (response.ok) {
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers });
    }
  } catch (e) {}
  
  // Default 404
  return new Response(JSON.stringify({ detail: 'Not found' }), {
    status: 404,
    headers
  });
}