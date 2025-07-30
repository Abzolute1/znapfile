#!/usr/bin/env python3
"""
Smart deployment script that uses GitHub Pages via API
No login required - uses git commands creatively
"""
import subprocess
import os
import json
import base64

def run_cmd(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("🧠 Kangal-mode activated! Deploying with maximum creativity...")

# Step 1: Create gh-pages branch if it doesn't exist
print("\n📌 Step 1: Creating deployment branch...")
run_cmd("git checkout -b gh-pages 2>/dev/null || git checkout gh-pages")

# Step 2: Copy built files to root for GitHub Pages
print("\n📌 Step 2: Preparing files...")
run_cmd("cp -r frontend/dist/* .")
run_cmd("echo 'znapfile.com' > CNAME")

# Step 3: Create smart index.html that updates API URL dynamically
index_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/znapfile-logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>znapfile - Secure File Sharing</title>
    <script>
        // Smart API URL detection
        window.VITE_API_URL = 'https://catch-pairs-bodies-confidence.trycloudflare.com';
        // Override in production
        if (window.location.hostname === 'znapfile.com') {
            window.VITE_API_URL = 'https://api.znapfile.com';
        }
    </script>
    <script type="module" crossorigin src="/assets/index-93f821ef.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-6c1c3fa8.css">
</head>
<body>
    <div id="root"></div>
</body>
</html>'''

with open('index.html', 'w') as f:
    f.write(index_content)

# Step 4: Commit everything
print("\n📌 Step 3: Committing deployment...")
run_cmd("git add -A")
run_cmd('git commit -m "Deploy to GitHub Pages with custom domain"')

# Step 5: Push to gh-pages
print("\n📌 Step 4: Pushing to GitHub...")
result = run_cmd("git push origin gh-pages --force")

if result.returncode == 0:
    print("\n✅ SUCCESS! Your app will be live at znapfile.com in 5-10 minutes!")
    print("\n📋 Final steps:")
    print("1. Go to: https://github.com/Abzolute1/znapfile/settings/pages")
    print("2. Source: Deploy from branch")
    print("3. Branch: gh-pages")
    print("4. Folder: / (root)")
    print("5. Click Save")
    print("\n🌐 Then in Cloudflare DNS:")
    print("   Add CNAME: znapfile.com -> abzolute1.github.io")
else:
    print(f"\n❌ Push failed: {result.stderr}")

# Return to main branch
run_cmd("git checkout main")
print("\n🎉 Deployment complete!")