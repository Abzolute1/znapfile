/**
 * Cloudflare Worker - API Proxy for znapfile.com
 * Deploy this to handle api.znapfile.com requests
 */

export default {
  async fetch(request, env, ctx) {
    // Get the URL and path
    const url = new URL(request.url);
    
    // Target backend - your Cloudflare tunnel
    const BACKEND_URL = 'https://catch-pairs-bodies-confidence.trycloudflare.com';
    
    // Create new URL with backend
    const targetUrl = BACKEND_URL + url.pathname + url.search;
    
    // Clone the request with new URL
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });
    
    // Add CORS headers for znapfile.com
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://znapfile.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Forward request to backend
      const response = await fetch(modifiedRequest);
      
      // Clone response and add CORS headers
      const modifiedResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedResponse.headers.set(key, value);
      });
      
      return modifiedResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
}