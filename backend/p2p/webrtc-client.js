/**
 * 🌌 P2P WEBRTC CLIENT
 * Every user becomes a node in the quantum network
 */

class QuantumP2PNetwork {
  constructor() {
    this.peers = new Map();
    this.files = new Map();
    this.signaling = 'wss://znapfile.deno.dev/api/p2p/signal';
    this.id = this.generateQuantumId();
    this.initializeNetwork();
  }
  
  generateQuantumId() {
    return 'quantum-' + crypto.randomUUID();
  }
  
  async initializeNetwork() {
    // Connect to signaling server
    this.ws = new WebSocket(this.signaling);
    
    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await this.handleSignaling(message);
    };
    
    this.ws.onopen = () => {
      console.log('🌌 Connected to Quantum Network');
      this.announcePresence();
    };
    
    // Initialize IndexedDB for local storage
    this.db = await this.initDatabase();
    
    // Start sharing existing files
    await this.shareLocalFiles();
  }
  
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuantumFileStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' });
        }
      };
    });
  }
  
  async createPeerConnection(peerId) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // Create data channel for file transfer
    const dataChannel = pc.createDataChannel('files', {
      ordered: true,
      maxRetransmits: 3
    });
    
    dataChannel.onopen = () => {
      console.log(`📡 Connected to peer: ${peerId}`);
      this.peers.set(peerId, { pc, dataChannel });
    };
    
    dataChannel.onmessage = async (event) => {
      await this.handleDataTransfer(event, peerId);
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice-candidate',
          target: peerId,
          candidate: event.candidate
        });
      }
    };
    
    return pc;
  }
  
  async handleDataTransfer(event, peerId) {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'file-list':
        // Peer is sharing their file list
        this.updatePeerFiles(peerId, message.files);
        break;
        
      case 'file-request':
        // Peer wants a file we have
        await this.sendFile(peerId, message.fileId);
        break;
        
      case 'file-chunk':
        // Receiving a file chunk
        await this.receiveChunk(message);
        break;
        
      case 'search-query':
        // Peer is searching for files
        const results = this.searchLocalFiles(message.query);
        this.sendToPeer(peerId, {
          type: 'search-results',
          results: results
        });
        break;
    }
  }
  
  async storeFileP2P(file) {
    // Split file into chunks
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = [];
    const fileId = crypto.randomUUID();
    
    for (let i = 0; i < file.size; i += chunkSize) {
      const chunk = file.slice(i, i + chunkSize);
      const chunkId = `${fileId}-${i / chunkSize}`;
      
      // Store locally
      await this.storeChunk(chunkId, chunk);
      chunks.push(chunkId);
      
      // Distribute to peers
      await this.distributeChunk(chunkId, chunk);
    }
    
    // Store file metadata
    const metadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      chunks: chunks,
      timestamp: Date.now(),
      peers: Array.from(this.peers.keys())
    };
    
    await this.storeMetadata(metadata);
    
    // Announce to network
    this.broadcastToNetwork({
      type: 'new-file',
      file: metadata
    });
    
    return fileId;
  }
  
  async distributeChunk(chunkId, chunk) {
    // Distribute chunks across multiple peers for redundancy
    const activePeers = Array.from(this.peers.keys());
    const redundancy = Math.min(3, activePeers.length);
    
    for (let i = 0; i < redundancy; i++) {
      const peerId = activePeers[i];
      await this.sendChunkToPeer(peerId, chunkId, chunk);
    }
  }
  
  async retrieveFileP2P(fileId) {
    // First check local storage
    const localFile = await this.getLocalFile(fileId);
    if (localFile) return localFile;
    
    // Query network for file
    const metadata = await this.queryNetwork(fileId);
    if (!metadata) throw new Error('File not found in quantum network');
    
    // Retrieve chunks from peers
    const chunks = await Promise.all(
      metadata.chunks.map(chunkId => this.retrieveChunk(chunkId))
    );
    
    // Reconstruct file
    const blob = new Blob(chunks, { type: metadata.type });
    return new File([blob], metadata.name, { type: metadata.type });
  }
  
  async retrieveChunk(chunkId) {
    // Try local storage first
    const localChunk = await this.getLocalChunk(chunkId);
    if (localChunk) return localChunk;
    
    // Find peers with this chunk
    const peers = await this.findPeersWithChunk(chunkId);
    
    // Request from fastest peer
    for (const peerId of peers) {
      try {
        const chunk = await this.requestChunkFromPeer(peerId, chunkId);
        if (chunk) {
          // Cache locally
          await this.storeChunk(chunkId, chunk);
          return chunk;
        }
      } catch (e) {
        console.log(`Failed to get chunk from ${peerId}, trying next...`);
      }
    }
    
    throw new Error(`Chunk ${chunkId} not found in network`);
  }
  
  // Quantum entanglement - files exist everywhere and nowhere
  async quantumEntangle(fileId) {
    const metadata = await this.getMetadata(fileId);
    
    // Create quantum copies across the network
    const entangledNodes = await this.createQuantumCopies(metadata);
    
    // Update metadata with quantum state
    metadata.quantumState = {
      entangled: true,
      nodes: entangledNodes,
      coherence: 1.0
    };
    
    await this.updateMetadata(metadata);
    
    return entangledNodes;
  }
  
  // Network-wide search using distributed hash table
  async searchQuantumNetwork(query) {
    const results = new Map();
    
    // Search local files
    const localResults = this.searchLocalFiles(query);
    localResults.forEach(r => results.set(r.id, r));
    
    // Query all peers
    const searchPromises = Array.from(this.peers.keys()).map(peerId =>
      this.queryPeer(peerId, query)
    );
    
    const peerResults = await Promise.all(searchPromises);
    peerResults.flat().forEach(r => results.set(r.id, r));
    
    return Array.from(results.values());
  }
  
  // Self-healing network
  async healNetwork() {
    // Check file integrity
    const files = await this.getAllFiles();
    
    for (const file of files) {
      const missingChunks = await this.checkFileIntegrity(file.id);
      
      if (missingChunks.length > 0) {
        console.log(`🔧 Healing file ${file.name}, missing ${missingChunks.length} chunks`);
        
        // Attempt to recover from network
        for (const chunkId of missingChunks) {
          await this.recoverChunk(chunkId);
        }
      }
    }
  }
}

// Initialize the Quantum Network
const quantumNetwork = new QuantumP2PNetwork();

// Expose to window for app integration
window.QuantumNetwork = quantumNetwork;

// Export for module usage
export default QuantumP2PNetwork;