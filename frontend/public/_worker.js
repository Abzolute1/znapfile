// Cloudflare Pages Function - Quantum Backend
// This runs on Cloudflare's edge network alongside your GitHub Pages site!

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, url);
    }
    
    // Serve static files
    return env.ASSETS.fetch(request);
  }
}

async function handleAPI(request, url) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*',
  };
  
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // Health check
  if (url.pathname === '/api/v1/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'cloudflare-pages-function',
      timestamp: new Date().toISOString()
    }), { headers });
  }
  
  // Login
  if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') {
    try {
      const { email, password } = await request.json();
      
      if (email === 'admin@znapfile.com' && password === 'SecurePass123!') {
        return new Response(JSON.stringify({
          user: {
            id: 'admin-001',
            email: 'admin@znapfile.com',
            username: 'admin',
            plan: 'max'
          },
          access_token: 'cf-pages-' + Date.now(),
          refresh_token: 'cf-pages-refresh-' + Date.now()
        }), { headers });
      }
      
      return new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
        status: 401,
        headers
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
        headers
      });
    }
  }
  
  // File upload (mock)
  if (url.pathname === '/api/v1/upload/anonymous' && request.method === 'POST') {
    const id = crypto.randomUUID();
    return new Response(JSON.stringify({
      id,
      download_page_url: `https://znapfile.com/download/${id}`,
      direct_download_url: `https://r2.znapfile.com/files/${id}`,
      filename: 'uploaded-file.txt',
      size: 1024,
      upload_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 86400000).toISOString()
    }), { headers });
  }
  
  return new Response(JSON.stringify({ detail: 'Not found' }), {
    status: 404,
    headers
  });
}