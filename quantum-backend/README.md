# 🌌 ZnapFile Quantum Backend

An immortal, distributed backend that runs everywhere and nowhere - completely FREE forever.

## Architecture

```
┌─────────────────┐
│ api.znapfile.com│ → Cloudflare Worker (Quantum Router)
└────────┬────────┘
         │
    ┌────┴────┐
    │ Routes  │
    └────┬────┘
         │
┌────────┴────────┬─────────────┬──────────────┬─────────────┐
│ Deno Deploy     │ Vercel      │ Netlify      │ Val.town    │
│ (TypeScript)    │ (Python)    │ (JavaScript) │ (Micro-fns) │
└─────────────────┴─────────────┴──────────────┴─────────────┘
         │                │               │              │
         └────────────────┴───────────────┴──────────────┘
                                │
                        ┌───────┴────────┐
                        │ Cloudflare R2  │
                        │ (File Storage) │
                        └────────────────┘
```

## Services

1. **Cloudflare Worker** - Main gateway & router
2. **Deno Deploy** - Core API (auth, uploads, files)
3. **Vercel** - Python compatibility layer
4. **Netlify** - Backup endpoints
5. **Val.town** - Utility functions

## Features

- ✅ 100% uptime (distributed across services)
- ✅ $0/month forever
- ✅ Auto-failover between services
- ✅ Global edge deployment
- ✅ No single point of failure