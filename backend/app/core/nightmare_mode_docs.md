# Nightmare Mode Security Implementation

## Overview

The Nightmare Mode security features are advanced bot detection mechanisms that only activate at HIGH threat levels (10+ failed attempts). They are designed to be completely invisible to normal users while making it exponentially harder for automated attacks.

## Threat Level Escalation

- **0-2 attempts**: No challenge (normal users)
- **3-4 attempts**: Simple math CAPTCHA (tired users might have mistyped)
- **5-9 attempts**: Basic Proof of Work (suspicious but could be legitimate)
- **10-14 attempts**: Nightmare Passive Mode (HIGH threat - passive detection)
- **15-19 attempts**: Nightmare Active Mode (VERY HIGH threat - active challenges)
- **20+ attempts**: Nightmare Full Mode (EXTREME threat - all defenses active)
- **30+ attempts**: Temporary blocks
- **50+ attempts**: Long temporary blocks
- **100+ attempts**: Permanent block

## Nightmare Mode Features

### 1. Nightmare Passive Mode (10-14 attempts)

**Features:**
- Standard Proof of Work (difficulty 3)
- Passive fingerprinting collection:
  - WebGL fingerprinting (GPU info, capabilities)
  - Audio API fingerprinting (audio context properties)
  - Font detection (installed fonts)
  - Canvas fingerprinting (rendering differences)

**User Experience:**
- Appears as a normal security challenge
- No additional user interaction required
- Slightly longer processing time (1-3 seconds)

### 2. Nightmare Active Mode (15-19 attempts)

**Features:**
- GPU-accelerated Proof of Work (difficulty 4)
- Active timing checks:
  - CSS animation timing verification
  - Service Worker integrity checks
  - WebGL shader computations
- All passive checks from previous level

**User Experience:**
- Challenge takes 3-10 seconds
- GPU acceleration message shown
- Still appears as a security verification

### 3. Nightmare Full Mode (20+ attempts)

**Features:**
- Maximum difficulty GPU Proof of Work (difficulty 5)
- Cross-origin iframe challenges
- Full environment attestation:
  - Headless browser detection
  - Automation tool detection
  - Hardware capability verification
- All previous checks enabled

**User Experience:**
- Challenge takes 10-30 seconds
- Shows "Advanced security verification"
- Only shown to obvious attackers

## Technical Implementation

### Backend (defense.py)

The ASR system creates different challenge types based on threat level:

```python
# Nightmare Passive: Collects data without user interaction
{
    "type": "nightmare_passive",
    "challenge_id": "...",
    "challenge": "...",
    "difficulty": 3,
    "passive_checks": ["webgl", "audio", "fonts", "canvas"]
}

# Nightmare Active: Requires active computation
{
    "type": "nightmare_active",
    "challenge_id": "...",
    "challenge": "...",
    "difficulty": 4,
    "gpu_required": True,
    "animation_test": {
        "duration": 3000,
        "checkpoints": [20, 40, 60, 80, 100]
    },
    "active_checks": ["webgl_shader", "css_timing", "worker_integrity"]
}

# Nightmare Full: Maximum security
{
    "type": "nightmare_full",
    "challenge_id": "...",
    "challenge": "...",
    "difficulty": 5,
    "gpu_required": True,
    "iframe_challenge": "...",
    "full_attestation": True,
    "all_checks": True
}
```

### Frontend (nightmareSecurity.js)

The client-side module handles:

1. **Passive Fingerprinting:**
   - Collects browser/device characteristics
   - No user interaction required
   - Undetectable to users

2. **GPU Proof of Work:**
   - Uses WebGL shaders for computation
   - Falls back to CPU if GPU unavailable
   - 10-100x faster than CPU-only

3. **Environment Attestation:**
   - Detects headless browsers
   - Checks for automation tools
   - Verifies hardware capabilities

## Bot Detection Mechanisms

### 1. WebGL Fingerprinting
- Detects fake/emulated GPUs
- Identifies headless browsers
- Unique per device/driver combination

### 2. Audio API Fingerprinting
- Creates unique audio context signature
- Detects browser automation
- Works even with muted audio

### 3. CSS Animation Timing
- Measures precise animation timing
- Detects accelerated/automated browsing
- Invisible to users

### 4. Service Worker Integrity
- Verifies browser environment
- Detects modified/injected workers
- Checks registration capabilities

### 5. Cross-Origin Iframe
- Tests browser security model
- Detects sandbox violations
- Verifies postMessage handling

## UX Considerations

### For Legitimate Users (Tired at 2 AM)

1. **First 9 attempts**: Simple challenges or basic PoW
2. **Recovery**: Successful login reduces threat score
3. **Grace period**: 24-hour window for attempts
4. **Clear messaging**: "Security verification" not "Bot check"

### Progressive Difficulty

1. **Transparent escalation**: Challenges get harder gradually
2. **Visual feedback**: Progress indicators for long challenges
3. **GPU acceleration**: Faster solving for legitimate users
4. **Fallback options**: CPU-only mode if GPU fails

## Security Benefits

1. **Computational cost**: Makes mass attacks expensive
2. **Device binding**: Fingerprints tie to specific hardware
3. **Behavioral analysis**: Timing patterns detect automation
4. **Layered defense**: Multiple detection methods
5. **Adaptive response**: Scales with threat level

## Testing

To test nightmare mode without making 10+ login attempts:

```python
# In defense.py, temporarily modify threat levels:
self.levels = [
    {"attempts": 0, "action": "none", "difficulty": 0},
    {"attempts": 1, "action": "nightmare_passive", "difficulty": 3},  # Test at 1 attempt
    {"attempts": 2, "action": "nightmare_active", "difficulty": 4},   # Test at 2 attempts
    {"attempts": 3, "action": "nightmare_full", "difficulty": 5},     # Test at 3 attempts
    # ... rest of levels
]
```

## Monitoring

Track these metrics:
- Challenge solve times by type
- GPU vs CPU fallback rates
- False positive rate (legitimate users hitting nightmare mode)
- Attack mitigation success rate

## Future Enhancements

1. **Machine Learning**: Behavioral pattern analysis
2. **WebRTC fingerprinting**: Network-level detection
3. **Touch/mouse pattern analysis**: Detect human interaction
4. **Cryptographic attestation**: Hardware security modules
5. **Distributed PoW**: Share computation across sessions