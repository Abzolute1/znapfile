#!/usr/bin/env node

console.log('🚀 Creating instant backend on Val.town...\n');

const backendCode = `
// ZnapFile Backend on Val.town
// This creates a FREE, instant HTTP endpoint!

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  };
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  // Health endpoint
  if (url.pathname.includes("/health")) {
    return Response.json({
      status: "ok",
      service: "val-town",
      timestamp: new Date().toISOString(),
      message: "ZnapFile Quantum Backend Active!"
    }, { headers });
  }
  
  // Login endpoint
  if (url.pathname.includes("/login") && req.method === "POST") {
    try {
      const body = await req.json();
      
      if (body.email === "admin@znapfile.com" && body.password === "SecurePass123!") {
        return Response.json({
          user: {
            id: "admin-001",
            email: "admin@znapfile.com",
            username: "admin",
            plan: "max"
          },
          access_token: "valtown-" + Date.now(),
          refresh_token: "valtown-refresh-" + Date.now()
        }, { headers });
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
  
  // File upload mock
  if (url.pathname.includes("/upload")) {
    const id = crypto.randomUUID();
    return Response.json({
      id,
      download_page_url: "https://znapfile.com/download/" + id,
      filename: "uploaded-file.txt",
      size: 1024,
      upload_date: new Date().toISOString()
    }, { headers });
  }
  
  // Default response
  return Response.json({
    message: "ZnapFile Quantum Backend",
    version: "1.0.0",
    endpoints: [
      "/api/v1/health",
      "/api/v1/auth/login",
      "/api/v1/upload/anonymous"
    ]
  }, { headers });
}
`;

console.log('📝 Val.town Backend Code Ready!\n');
console.log('TO DEPLOY (30 seconds):');
console.log('1. Go to: https://www.val.town/new/http');
console.log('2. Delete the default code');
console.log('3. Paste this code:');
console.log('---CODE START---');
console.log(backendCode);
console.log('---CODE END---');
console.log('\n4. Click "Run" at the bottom');
console.log('5. Your backend URL will appear!');
console.log('6. It will look like: https://[username]-[valname].web.val.run\n');

// Try to copy to clipboard
try {
  require('child_process').execSync('pbcopy', { input: backendCode });
  console.log('✅ Code copied to clipboard!');
} catch {
  try {
    require('child_process').execSync('xclip -selection clipboard', { input: backendCode });
    console.log('✅ Code copied to clipboard!');
  } catch {
    console.log('📋 Code saved to: valtown-backend.js');
    require('fs').writeFileSync('valtown-backend.js', backendCode);
  }
}

console.log('\n🎉 Your backend will be LIVE in 30 seconds!');
console.log('💰 Cost: $0/month forever!');
console.log('⚡ No account needed for read-only access!');