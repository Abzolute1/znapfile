#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🌌 ZnapFile Quantum Deploy Tool');
console.log('================================\n');

// Auto-deploy to Deno Playground
async function deployToDenoPlayground() {
  console.log('📦 Deploying to Deno Playground...');
  
  const code = fs.readFileSync(path.join(__dirname, '../deno-playground.ts'), 'utf8');
  
  console.log('\n✅ Deno Playground code ready!');
  console.log('👉 Go to: https://deno.com/playground');
  console.log('👉 Paste the code and click "Share"');
  console.log('👉 Your backend will be instantly available!\n');
  
  // Copy to clipboard if possible
  try {
    require('child_process').execSync('pbcopy', { input: code });
    console.log('📋 Code copied to clipboard!');
  } catch {
    try {
      require('child_process').execSync('xclip -selection clipboard', { input: code });
      console.log('📋 Code copied to clipboard!');
    } catch {
      console.log('📄 Code saved to: deno-playground-code.txt');
      fs.writeFileSync('deno-playground-code.txt', code);
    }
  }
}

// Deploy to free services
async function deployToFreeServices() {
  console.log('\n🚀 Deploying to free services...\n');
  
  // Check for required CLIs
  const clis = {
    vercel: 'npm i -g vercel',
    netlify: 'npm i -g netlify-cli',
    wrangler: 'npm i -g wrangler'
  };
  
  for (const [cli, install] of Object.entries(clis)) {
    try {
      execSync(`which ${cli}`, { stdio: 'ignore' });
    } catch {
      console.log(`📦 Installing ${cli}...`);
      execSync(install, { stdio: 'inherit' });
    }
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Deploy to Vercel:');
  console.log('   cd quantum-backend/vercel && vercel --prod');
  console.log('\n2. Deploy to Netlify:');
  console.log('   cd quantum-backend/netlify && netlify init && netlify deploy --prod');
  console.log('\n3. Deploy Cloudflare Worker:');
  console.log('   cd quantum-backend/cloudflare && wrangler login && wrangler deploy');
}

// Main deployment
async function main() {
  await deployToDenoPlayground();
  await deployToFreeServices();
  
  console.log('\n✨ Deployment instructions ready!');
  console.log('🌐 Your quantum backend will be distributed across:');
  console.log('   • Deno Deploy (via playground)');
  console.log('   • Vercel Functions');
  console.log('   • Netlify Functions');
  console.log('   • Cloudflare Workers');
  console.log('\n💰 Total cost: $0/month forever!');
}

main().catch(console.error);