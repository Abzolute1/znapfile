// ZnapFile Quantum Backend - Val.town Version
// Deploy at: https://val.town/new
// This creates a permanent HTTP endpoint!

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  };
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  // Health check
  if (url.pathname.includes("/health")) {
    return Response.json({
      status: "ok",
      service: "val-town",
      timestamp: new Date().toISOString()
    }, { headers });
  }
  
  // Mock login
  if (url.pathname.includes("/login") && req.method === "POST") {
    const body = await req.json();
    if (body.email === "admin@znapfile.com" && body.password === "SecurePass123!") {
      return Response.json({
        user: {
          id: "admin-001",
          email: "admin@znapfile.com",
          username: "admin",
          plan: "max"
        },
        access_token: "val-town-token-" + Date.now(),
        refresh_token: "val-town-refresh-" + Date.now()
      }, { headers });
    }
    return new Response(JSON.stringify({ detail: "Invalid credentials" }), {
      status: 401,
      headers
    });
  }
  
  return Response.json({ 
    message: "ZnapFile Quantum Backend on Val.town",
    endpoints: ["/health", "/api/v1/auth/login"]
  }, { headers });
}