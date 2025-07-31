// ZnapFile Backend on Glitch - FREE Forever!
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Keep Glitch app awake
app.get('/', (req, res) => {
  res.json({
    message: 'ZnapFile Quantum Backend',
    status: 'active',
    endpoints: {
      health: '/api/v1/health',
      login: '/api/v1/auth/login',
      upload: '/api/v1/upload/anonymous'
    }
  });
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'glitch',
    timestamp: new Date().toISOString(),
    url: `https://${process.env.PROJECT_DOMAIN}.glitch.me`
  });
});

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@znapfile.com' && password === 'SecurePass123!') {
    res.json({
      user: {
        id: 'admin-001',
        email: 'admin@znapfile.com',
        username: 'admin',
        plan: 'max'
      },
      access_token: 'glitch-' + Date.now(),
      refresh_token: 'glitch-refresh-' + Date.now()
    });
  } else {
    res.status(401).json({ detail: 'Invalid credentials' });
  }
});

// File upload endpoint (mock)
app.post('/api/v1/upload/anonymous', (req, res) => {
  const id = Math.random().toString(36).substr(2, 9);
  res.json({
    id,
    download_page_url: `https://znapfile.com/download/${id}`,
    direct_download_url: `https://r2.znapfile.com/files/${id}`,
    filename: 'uploaded-file.txt',
    size: 1024,
    upload_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 86400000).toISOString()
  });
});

// File info endpoint
app.get('/api/v1/files/:id', (req, res) => {
  res.json({
    id: req.params.id,
    filename: 'file.txt',
    size: 1024,
    upload_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 86400000).toISOString(),
    download_count: 0,
    is_password_protected: false
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 ZnapFile Backend is running on port', listener.address().port);
  console.log('🌐 Your app is live at https://' + process.env.PROJECT_DOMAIN + '.glitch.me');
});

// Keep the app awake (ping every 5 minutes)
const http = require('http');
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/api/v1/health`);
  }
}, 280000); // 4.6 minutes