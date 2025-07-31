// Cloudflare Worker - Quantum Router
// Routes requests to the fastest available backend

const BACKENDS = [
  {
    name: 'deno-deploy',
    url: 'https://znapfile.deno.dev',
    weight: 3, // Higher weight = more traffic
    healthCheck: '/health'
  },
  {
    name: 'vercel',
    url: 'https://znapfile.vercel.app',
    weight: 2,
    healthCheck: '/api/health'
  },
  {
    name: 'netlify',
    url: 'https://znapfile.netlify.app/.netlify/functions',
    weight: 2,
    healthCheck: '/health'
  },
  {
    name: 'local-tunnel',
    url: 'https://catch-pairs-bodies-confidence.trycloudflare.com',
    weight: 1, // Fallback
    healthCheck: '/api/v1/health'
  }
];

// Cache for backend health status
const healthCache = new Map();

async function checkBackendHealth(backend) {
  const cacheKey = backend.name;
  const cached = healthCache.get(cacheKey);
  
  // Use cached result if less than 30 seconds old
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.healthy;
  }
  
  try {
    const response = await fetch(backend.url + backend.healthCheck, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    
    const healthy = response.ok;
    healthCache.set(cacheKey, { healthy, timestamp: Date.now() });
    return healthy;
  } catch {
    healthCache.set(cacheKey, { healthy: false, timestamp: Date.now() });
    return false;
  }
}

async function selectBackend() {
  // Check health of all backends in parallel
  const healthChecks = await Promise.all(
    BACKENDS.map(async (backend) => ({
      backend,
      healthy: await checkBackendHealth(backend)
    }))
  );
  
  // Filter healthy backends
  const healthyBackends = healthChecks
    .filter(({ healthy }) => healthy)
    .map(({ backend }) => backend);
  
  if (healthyBackends.length === 0) {
    // If no backends are healthy, use all as fallback
    return BACKENDS[0];
  }
  
  // Weighted random selection
  const totalWeight = healthyBackends.reduce((sum, b) => sum + b.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const backend of healthyBackends) {
    random -= backend.weight;
    if (random <= 0) {
      return backend;
    }
  }
  
  return healthyBackends[0];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check for the worker itself
    if (url.pathname === '/health') {
      const backends = await Promise.all(
        BACKENDS.map(async (backend) => ({
          name: backend.name,
          url: backend.url,
          healthy: await checkBackendHealth(backend)
        }))
      );
      
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'cloudflare-worker',
        backends
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Select backend
    const backend = await selectBackend();
    
    // Forward the request
    const backendUrl = backend.url + url.pathname + url.search;
    
    try {
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      });
      
      // Clone response with CORS headers
      const modifiedHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedHeaders.set(key, value);
      });
      
      // Add backend info header for debugging
      modifiedHeaders.set('X-Backend-Service', backend.name);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: modifiedHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Backend request failed',
        backend: backend.name,
        message: error.message
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};