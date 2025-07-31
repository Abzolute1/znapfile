// Main Deno Deploy application
import { Application, Router, oakCors } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { createUser, authenticateUser, createTokens, verifyToken } from "./auth.ts";
import { uploadFile, getFileUrl, deleteFile } from "./storage.ts";

const app = new Application();
const router = new Router();

// CORS configuration
app.use(oakCors({
  origin: [
    "https://znapfile.com",
    "https://www.znapfile.com", 
    "https://alexmaras.github.io",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true,
}));

// Health check
router.get("/health", (ctx) => {
  ctx.response.body = { 
    status: "ok", 
    service: "deno-deploy",
    timestamp: new Date().toISOString() 
  };
});

// Auth endpoints
router.post("/api/v1/auth/register", async (ctx) => {
  const body = await ctx.request.body().value;
  const { email, username, password } = body;
  
  try {
    const user = await createUser(email, username, password);
    const tokens = await createTokens(user);
    
    ctx.response.body = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        plan: user.plan,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { detail: error.message };
  }
});

router.post("/api/v1/auth/login", async (ctx) => {
  const body = await ctx.request.body().value;
  const { email, password } = body;
  
  const user = await authenticateUser(email, password);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { detail: "Invalid credentials" };
    return;
  }
  
  const tokens = await createTokens(user);
  
  ctx.response.body = {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      plan: user.plan,
    },
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  };
});

// File upload endpoint
router.post("/api/v1/upload/anonymous", async (ctx) => {
  const formData = await ctx.request.body({ type: "form-data" }).value.read();
  const file = formData.files?.[0];
  
  if (!file) {
    ctx.response.status = 400;
    ctx.response.body = { detail: "No file provided" };
    return;
  }
  
  const fileData = await Deno.readFile(file.filename!);
  const result = await uploadFile(
    fileData,
    file.originalName,
    file.contentType || "application/octet-stream"
  );
  
  ctx.response.body = {
    id: result.id,
    download_page_url: `https://znapfile.com/download/${result.id}`,
    direct_download_url: result.url,
    filename: file.originalName,
    size: result.size,
    upload_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
});

// Get file info
router.get("/api/v1/files/:id", async (ctx) => {
  const { id } = ctx.params;
  
  // For now, return mock data (will implement DB later)
  ctx.response.body = {
    id,
    filename: "file.txt",
    size: 1024,
    upload_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    download_count: 0,
    is_password_protected: false,
  };
});

// Download file
router.get("/api/v1/files/:id/download", async (ctx) => {
  const { id } = ctx.params;
  
  // Generate presigned URL
  const url = await getFileUrl(`anonymous/${id}/file.txt`);
  
  ctx.response.redirect(url);
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log("🦕 Deno Deploy server running at https://znapfile.deno.dev");
await app.listen({ port: 8000 });