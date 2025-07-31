#!/bin/bash

# Script to enable GitHub Pages for Abzolute1/znapfile repository
# Usage: ./enable-github-pages.sh <github-token>

if [ $# -eq 0 ]; then
    echo "Error: GitHub token required"
    echo "Usage: $0 <github-token>"
    echo ""
    echo "To create a personal access token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Give it a name and select the 'repo' scope"
    echo "4. Click 'Generate token' and copy the token"
    exit 1
fi

TOKEN=$1
OWNER="Abzolute1"
REPO="znapfile"

echo "Enabling GitHub Pages for $OWNER/$REPO..."

# Enable GitHub Pages with /frontend/dist-github as the source
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/pages" \
  -d '{
    "source": {
      "branch": "main",
      "path": "/frontend/dist-github"
    },
    "cname": "znapfile.com"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo "✓ GitHub Pages enabled successfully!"
    echo "Response: $BODY"
    
    # Display the GitHub Pages URL
    URL=$(echo "$BODY" | grep -o '"html_url":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$URL" ]; then
        echo ""
        echo "GitHub Pages URL: $URL"
    fi
    
    # Check if custom domain was set
    CNAME=$(echo "$BODY" | grep -o '"cname":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$CNAME" ]; then
        echo "Custom domain: $CNAME"
        echo ""
        echo "Note: Make sure to configure your DNS settings:"
        echo "- Add a CNAME record pointing to $OWNER.github.io"
        echo "- Or add A records pointing to GitHub's IP addresses"
    fi
else
    echo "✗ Failed to enable GitHub Pages"
    echo "HTTP Status Code: $HTTP_CODE"
    echo "Response: $BODY"
    
    if [ "$HTTP_CODE" -eq 404 ]; then
        echo ""
        echo "Possible reasons:"
        echo "- Repository not found or private"
        echo "- Token doesn't have access to the repository"
    elif [ "$HTTP_CODE" -eq 401 ]; then
        echo ""
        echo "Authentication failed. Check your token."
    elif [ "$HTTP_CODE" -eq 422 ]; then
        echo ""
        echo "The request was invalid. Common reasons:"
        echo "- The branch 'main' doesn't exist"
        echo "- The path '/frontend/dist-github' doesn't exist"
        echo "- GitHub Pages might already be enabled"
    fi
fi