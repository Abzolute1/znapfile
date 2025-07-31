// ZnapFile Quantum Backend - Deno Playground Version
// Deploy instantly at: https://deno.com/playground
// Then click "Share" to get a permanent URL!

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const ADMIN_USER = {
  id: "admin-001",
  email: "admin@znapfile.com",
  username: "admin",
  password: "SecurePass123!", // In real app, this would be hashed
  plan: "max"
};

// Simple JWT implementation
function createToken(user: any): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    plan: user.plan,
    exp: Date.now() + 3600000 // 1 hour
  }));
  return `${header}.${payload}.fake-signature`;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  // Health check
  if (url.pathname === "/health" || url.pathname === "/api/v1/health") {
    return new Response(JSON.stringify({
      status: "ok",
      service: "deno-playground",
      timestamp: new Date().toISOString()
    }), { headers });
  }
  
  // Login endpoint
  if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;
      
      if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
        const token = createToken(ADMIN_USER);
        return new Response(JSON.stringify({
          user: {
            id: ADMIN_USER.id,
            email: ADMIN_USER.email,
            username: ADMIN_USER.username,
            plan: ADMIN_USER.plan
          },
          access_token: token,
          refresh_token: token
        }), { headers });
      }
      
      return new Response(JSON.stringify({ detail: "Invalid credentials" }), {
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
  
  // File upload endpoint (mock)
  if (url.pathname === "/api/v1/upload/anonymous" && req.method === "POST") {
    const id = crypto.randomUUID();
    return new Response(JSON.stringify({
      id,
      download_page_url: `https://znapfile.com/download/${id}`,
      direct_download_url: `https://r2.znapfile.com/files/${id}`,
      filename: "uploaded-file.txt",
      size: 1024,
      upload_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 86400000).toISOString()
    }), { headers });
  }
  
  // File info endpoint (mock)
  if (url.pathname.match(/^\/api\/v1\/files\/[\w-]+$/)) {
    const id = url.pathname.split("/").pop();
    return new Response(JSON.stringify({
      id,
      filename: "file.txt",
      size: 1024,
      upload_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 86400000).toISOString(),
      download_count: 0,
      is_password_protected: false
    }), { headers });
  }
  
  // Default 404
  return new Response(JSON.stringify({ detail: "Not found" }), {
    status: 404,
    headers
  });
}

console.log("🚀 ZnapFile Quantum Backend running!");
console.log("📝 Copy this code to https://deno.com/playground");
console.log("🔗 Click 'Share' to get your permanent backend URL!");

serve(handler, { port: 8000 });