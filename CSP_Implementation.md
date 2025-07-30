# Content Security Policy (CSP) Implementation

## Overview
We've implemented a nonce-based CSP to replace `unsafe-inline` directives, providing better XSS protection.

## Backend Implementation

### CSP Nonce Generation
- Each request generates a unique cryptographic nonce
- Nonce is stored in request state
- CSP header includes the nonce for scripts and styles

### Security Headers
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'nonce-{unique-nonce}'; 
  style-src 'self' 'nonce-{unique-nonce}'; 
  img-src 'self' data: https:; 
  font-src 'self'; 
  connect-src 'self' https://*.cloudflarestorage.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests
```

## Frontend Implementation Guide

### Getting the CSP Nonce
```javascript
// Fetch CSP nonce from backend
const response = await fetch('/api/v1/security/csp-nonce');
const { nonce } = await response.json();
```

### Using Nonce in Inline Scripts
```html
<!-- Before -->
<script>
  console.log('Hello World');
</script>

<!-- After -->
<script nonce="${nonce}">
  console.log('Hello World');
</script>
```

### Using Nonce in Inline Styles
```html
<!-- Before -->
<style>
  .custom { color: red; }
</style>

<!-- After -->
<style nonce="${nonce}">
  .custom { color: red; }
</style>
```

### React Example
```jsx
import { useEffect, useState } from 'react';

function App() {
  const [cspNonce, setCSPNonce] = useState('');
  
  useEffect(() => {
    // Get CSP nonce on app load
    fetch('/api/v1/security/csp-nonce')
      .then(res => res.json())
      .then(data => setCSPNonce(data.nonce));
  }, []);
  
  return (
    <div>
      {/* Use nonce in inline styles */}
      <style nonce={cspNonce}>
        {`.dynamic-style { color: blue; }`}
      </style>
      
      {/* For scripts, you'd typically use external files instead */}
    </div>
  );
}
```

## Best Practices

1. **Avoid Inline Scripts/Styles**: Move them to external files when possible
2. **Dynamic Content**: For dynamically generated styles/scripts, always include the nonce
3. **Third-Party Libraries**: Ensure they support CSP or use external resources
4. **Testing**: Test thoroughly as CSP violations will block content

## Migration Steps

1. Identify all inline scripts and styles in the frontend
2. Move as many as possible to external files
3. For remaining inline content, add nonce attributes
4. Test in browser console for CSP violations
5. Fix any violations before deployment

## Benefits

- **XSS Protection**: Prevents execution of injected scripts
- **Security Best Practice**: Follows OWASP recommendations
- **Future Proof**: Prepares for stricter browser security policies
- **Audit Compliance**: Meets security audit requirements