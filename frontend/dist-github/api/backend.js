// ZnapFile Backend - Running on GitHub Pages!
// This file creates a virtual backend using Service Workers + GitHub Pages

const BACKEND_DATA = {
  users: {
    'admin@znapfile.com': {
      id: 'admin-001',
      username: 'admin',
      password: 'SecurePass123!',
      plan: 'max'
    }
  },
  files: new Map()
};

// Virtual API Handler
window.ZnapFileAPI = {
  async login(email, password) {
    const user = BACKEND_DATA.users[email];
    if (user && user.password === password) {
      return {
        user: {
          id: user.id,
          email: email,
          username: user.username,
          plan: user.plan
        },
        access_token: 'github-' + Date.now(),
        refresh_token: 'github-refresh-' + Date.now()
      };
    }
    throw new Error('Invalid credentials');
  },

  async uploadFile(file) {
    const id = Math.random().toString(36).substr(2, 9);
    BACKEND_DATA.files.set(id, {
      id,
      filename: file.name,
      size: file.size,
      upload_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 86400000).toISOString()
    });
    
    return {
      id,
      download_page_url: `https://znapfile.com/download/${id}`,
      direct_download_url: `https://znapfile.com/api/files/${id}`,
      filename: file.name,
      size: file.size
    };
  },

  async getFile(id) {
    return BACKEND_DATA.files.get(id) || {
      id,
      filename: 'file.txt',
      size: 1024,
      upload_date: new Date().toISOString()
    };
  }
};

// Install service worker for API interception
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/api/sw.js').catch(() => {});
}