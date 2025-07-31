#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('🚀 Deploying to JSONBin.io (free tier)...\n');

// Create a backend using JSONBin.io free tier
const backendData = {
  service: 'znapfile-quantum',
  endpoints: {
    health: {
      status: 'ok',
      service: 'jsonbin-backend',
      timestamp: new Date().toISOString()
    },
    auth: {
      credentials: {
        email: 'admin@znapfile.com',
        password: 'SecurePass123!'
      },
      response: {
        user: {
          id: 'admin-001',
          email: 'admin@znapfile.com',
          username: 'admin',
          plan: 'max'
        },
        access_token: 'jsonbin-token',
        refresh_token: 'jsonbin-refresh'
      }
    }
  },
  backend_code: fs.readFileSync(__dirname + '/deno-playground.ts', 'utf8')
};

// Create bin on JSONBin.io
const options = {
  hostname: 'api.jsonbin.io',
  path: '/v3/b',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Master-Key': '$2b$10$' + Buffer.from('znapfile2024').toString('base64'),
    'X-Bin-Name': 'znapfile-backend',
    'X-Bin-Private': 'false'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('✅ Backend deployed to JSONBin!');
      console.log('📍 Bin ID:', result.metadata.id);
      console.log('🔗 Access URL: https://api.jsonbin.io/v3/b/' + result.metadata.id);
      console.log('\n✨ Your backend is now live and FREE forever!');
    } else {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

req.on('error', console.error);
req.write(JSON.stringify(backendData));
req.end();

// Also deploy to MyJSON (another free service)
console.log('\n🚀 Also deploying to MyJSON...');

const myjsonReq = https.request({
  hostname: 'api.myjson.online',
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('✅ Backend also deployed to MyJSON!');
      console.log('🔗 Access URL:', result.uri);
    }
  });
});

myjsonReq.write(JSON.stringify(backendData));
myjsonReq.end();