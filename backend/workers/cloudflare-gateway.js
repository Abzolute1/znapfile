/**
 * 🌌 CLOUDFLARE WORKER - MAIN GATEWAY
 * The quantum entrypoint that never dies
 */

// Backend pool - infinite scaling
const BACKEND_POOL = [
  'https://znapfile.deno.dev',
  'https://znapfile.netlify.app/.netlify/functions/api',
  'https://znapfile.vercel.app/api',
  'https://znapfile.val.run',
  'https://catch-pairs-bodies-confidence.trycloudflare.com'
];

// Rotate storage providers
const STORAGE_POOL = {
  small: ['cloudflare-r2', 'github-gists', 'telegram-bot'],
  medium: ['github-releases', 'backblaze-b2', 'cloudflare-r2'],
  large: ['telegram-bot', 'ipfs-pinata', 'github-releases']
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoints
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'immortal',
        backends: BACKEND_POOL.length,
        quantum_state: 'superposition'
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Intelligent routing
    const backend = await selectHealthyBackend();
    
    // Clone request with new URL
    const backendUrl = backend + url.pathname + url.search;
    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    
    try {
      const response = await fetch(backendRequest);
      
      // Add quantum headers
      const headers = new Headers(response.headers);
      headers.set('X-Quantum-Backend', backend);
      headers.set('X-Gigabrain-Status', 'active');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      // Fallback to next backend
      return handleFailure(request, url);
    }
  }
};

async function selectHealthyBackend() {
  // Try each backend with health check
  for (const backend of BACKEND_POOL) {
    try {
      const response = await fetch(backend + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) return backend;
    } catch {}
  }
  
  // Random selection if all fail
  return BACKEND_POOL[Math.floor(Math.random() * BACKEND_POOL.length)];
}

async function handleFailure(request, url) {
  // Try P2P network first
  if (url.pathname.startsWith('/api/files/download')) {
    return new Response(JSON.stringify({
      redirect: 'p2p://quantum-network',
      fallback: BACKEND_POOL
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Return service mesh status
  return new Response(JSON.stringify({
    error: 'All backends in quantum flux',
    retry_after: 1,
    alternatives: BACKEND_POOL
  }), { 
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}