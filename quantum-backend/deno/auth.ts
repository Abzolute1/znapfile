// Authentication service for Deno Deploy
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "quantum-secret-key";
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"],
);

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  is_active: boolean;
  is_verified: boolean;
  plan: "free" | "pro" | "max";
  created_at: string;
}

// Temporary in-memory storage (will use D1 or KV later)
const users = new Map<string, User>();
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
  const user: User = {
    id: nanoid(),
    email: email.toLowerCase(),
    username,
    password_hash: await hashPassword(password),
    is_active: true,
    is_verified: false,
    plan: "free",
    created_at: new Date().toISOString(),
  };
  
  users.set(user.id, user);
  users.set(user.email, user); // Also index by email
  
  return user;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = users.get(email.toLowerCase());
  if (!user) return null;
  
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;
  
  return user;
}

export async function createTokens(user: User) {
  const accessToken = await create({ alg: "HS256", typ: "JWT" }, {
    sub: user.id,
    email: user.email,
    plan: user.plan,
    exp: Date.now() / 1000 + 3600, // 1 hour
  }, key);
  
  const refreshToken = await create({ alg: "HS256", typ: "JWT" }, {
    sub: user.id,
    type: "refresh",
    exp: Date.now() / 1000 + 604800, // 7 days
  }, key);
  
  return { accessToken, refreshToken };
}

export async function verifyToken(token: string) {
  try {
    const payload = await verify(token, key);
    return payload;
  } catch {
    return null;
  }
}

// Initialize with admin user
const adminUser = await createUser("admin@znapfile.com", "admin", "SecurePass123!");
adminUser.is_verified = true;
adminUser.plan = "max";