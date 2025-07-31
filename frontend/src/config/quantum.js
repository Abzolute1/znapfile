// Quantum Backend Configuration
// This distributes requests across multiple free services

const QUANTUM_BACKENDS = [
  {
    name: 'deno-playground',
    url: 'https://dash.deno.com/playground/YOUR_PLAYGROUND_ID', // Update after deployment
    priority: 1
  },
  {
    name: 'vercel',
    url: 'https://znapfile.vercel.app',
    priority: 2
  },
  {
    name: 'netlify',
    url: 'https://znapfile.netlify.app/.netlify/functions',
    priority: 3
  },
  {
    name: 'val-town',
    url: 'https://YOUR_USERNAME.val.run/quantum-backend', // Update after deployment
    priority: 4
  },
  {
    name: 'cloudflare-tunnel',
    url: 'https://catch-pairs-bodies-confidence.trycloudflare.com',
    priority: 5 // Fallback to local
  }
];

// Quantum backend selector
export async function getQuantumBackend() {
  // Try each backend in order of priority
  for (const backend of QUANTUM_BACKENDS.sort((a, b) => a.priority - b.priority)) {
    try {
      const response = await fetch(`${backend.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      if (response.ok) {
        console.log(`🌌 Quantum connection established: ${backend.name}`);
        return backend.url;
      }
    } catch (e) {
      console.log(`❌ ${backend.name} unavailable, trying next...`);
    }
  }
  
  // Default fallback
  return QUANTUM_BACKENDS[0].url;
}

// Initialize quantum connection on load
if (typeof window !== 'undefined') {
  getQuantumBackend().then(url => {
    window.QUANTUM_BACKEND = url;
    console.log(`✨ Using quantum backend: ${url}`);
  });
}