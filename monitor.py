import requests
import time

sites = {
    "GitHub Pages": "https://abzolute1.github.io/znapfile",
    "Backend API": "https://catch-pairs-bodies-confidence.trycloudflare.com/docs"
}

print("🔍 Monitoring deployment status...")
for name, url in sites.items():
    try:
        r = requests.get(url, timeout=5)
        status = "✅ ONLINE" if r.status_code == 200 else f"⚠️  {r.status_code}"
    except:
        status = "❌ OFFLINE"
    print(f"{name}: {status}")
