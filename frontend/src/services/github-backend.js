// GitHub Pages Backend Adapter
// This allows the frontend to work with static JSON files on GitHub Pages

const GITHUB_API_BASE = 'https://znapfile.com/api';

export class GitHubBackendAdapter {
  static async handleLogin(email, password) {
    // First try the service worker
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {}
    
    // Fallback to static JSON
    const authData = await fetch(`${GITHUB_API_BASE}/auth/login.json`).then(r => r.json());
    const userCreds = authData.credentials[email];
    
    if (userCreds && userCreds.password === password) {
      return userCreds.response;
    }
    
    throw new Error('Invalid credentials');
  }
  
  static async checkHealth() {
    try {
      // Try service worker first
      const response = await fetch('/api/v1/health');
      if (response.ok) return await response.json();
    } catch (e) {}
    
    // Fallback to static JSON
    return fetch(`${GITHUB_API_BASE}/health.json`).then(r => r.json());
  }
}

// Install on window for global access
if (typeof window !== 'undefined') {
  window.GitHubBackend = GitHubBackendAdapter;
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/api/sw.js')
      .then(() => console.log('✅ GitHub Backend Service Worker active'))
      .catch(() => console.log('📁 Using static JSON backend'));
  }
}