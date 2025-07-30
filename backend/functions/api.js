// Netlify Function - API Gateway
exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  
  // Handle health check
  if (path === '/health') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        service: 'netlify-functions',
        status: 'immortal',
        quantum_state: 'superposition'
      })
    };
  }
  
  // Forward to backup backends
  const backends = [
    'https://catch-pairs-bodies-confidence.trycloudflare.com',
    'https://znapfile.deno.dev',
    'https://znapfile.vercel.app'
  ];
  
  // Try each backend
  for (const backend of backends) {
    try {
      const response = await fetch(backend + path, {
        method: event.httpMethod,
        headers: event.headers,
        body: event.body
      });
      
      if (response.ok) {
        const body = await response.text();
        return {
          statusCode: response.status,
          body: body,
          headers: {
            'Content-Type': response.headers.get('content-type') || 'application/json',
            'X-Quantum-Backend': backend
          }
        };
      }
    } catch (e) {
      console.log(`Backend ${backend} failed, trying next...`);
    }
  }
  
  return {
    statusCode: 503,
    body: JSON.stringify({
      error: 'All backends in quantum flux',
      retry_after: 1
    })
  };
};