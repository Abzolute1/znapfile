// Initialize Quantum Network on page load
import QuantumP2PNetwork from '/p2p/webrtc-client.js';

window.addEventListener('load', async () => {
  console.log('🌌 Initializing Quantum Network...');
  
  // Check if running in supported browser
  if (!window.RTCPeerConnection || !window.indexedDB) {
    console.warn('Browser does not support full P2P features');
    return;
  }
  
  // Initialize network
  window.quantum = new QuantumP2PNetwork();
  
  // Set service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/quantum-worker.js');
  }
});
