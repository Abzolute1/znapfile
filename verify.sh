#!/bin/bash
echo "🔍 Verifying ZnapFile deployment..."
echo "=================================="

# Check GitHub Pages
echo -n "GitHub Pages: "
curl -s -o /dev/null -w "%{http_code}" https://abzolute1.github.io/znapfile | grep -q "200" && echo "✅ ONLINE" || echo "❌ OFFLINE"

# Check backend
echo -n "Backend API: "
curl -s -o /dev/null -w "%{http_code}" https://catch-pairs-bodies-confidence.trycloudflare.com/docs | grep -q "200" && echo "✅ ONLINE" || echo "❌ OFFLINE"

# DNS lookup
echo -e "
📍 DNS Status for znapfile.com:"
dig +short znapfile.com

echo -e "
📋 Next Steps:"
echo "1. Go to: https://github.com/Abzolute1/znapfile/settings/pages"
echo "2. Verify source is set to 'gh-pages' branch"
echo "3. Add custom domain: znapfile.com"
echo "4. In Cloudflare DNS, add:"
echo "   - CNAME @ -> abzolute1.github.io"
echo "5. Wait 5-10 minutes for propagation"
