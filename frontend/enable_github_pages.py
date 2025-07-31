#!/usr/bin/env python3
"""
Script to enable GitHub Pages for Abzolute1/znapfile repository
Usage: python enable_github_pages.py <github-token>
"""

import sys
import json
import requests

def enable_github_pages(token):
    """Enable GitHub Pages for the repository"""
    owner = "Abzolute1"
    repo = "znapfile"
    
    # GitHub API endpoint for Pages
    url = f"https://api.github.com/repos/{owner}/{repo}/pages"
    
    # Headers for authentication
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    
    # Request body
    data = {
        "source": {
            "branch": "main",
            "path": "/frontend/dist-github"
        },
        "cname": "znapfile.com"
    }
    
    print(f"Enabling GitHub Pages for {owner}/{repo}...")
    
    # Make the API request
    response = requests.put(url, headers=headers, json=data)
    
    # Handle the response
    if response.status_code in [200, 201]:
        print("✓ GitHub Pages enabled successfully!")
        
        result = response.json()
        print(f"\nResponse: {json.dumps(result, indent=2)}")
        
        if "html_url" in result:
            print(f"\nGitHub Pages URL: {result['html_url']}")
        
        if "cname" in result:
            print(f"Custom domain: {result['cname']}")
            print("\nNote: Make sure to configure your DNS settings:")
            print(f"- Add a CNAME record pointing to {owner}.github.io")
            print("- Or add A records pointing to GitHub's IP addresses:")
            print("  - 185.199.108.153")
            print("  - 185.199.109.153")
            print("  - 185.199.110.153")
            print("  - 185.199.111.153")
    else:
        print(f"✗ Failed to enable GitHub Pages")
        print(f"HTTP Status Code: {response.status_code}")
        
        try:
            error_data = response.json()
            print(f"Response: {json.dumps(error_data, indent=2)}")
        except:
            print(f"Response: {response.text}")
        
        if response.status_code == 404:
            print("\nPossible reasons:")
            print("- Repository not found or private")
            print("- Token doesn't have access to the repository")
        elif response.status_code == 401:
            print("\nAuthentication failed. Check your token.")
        elif response.status_code == 422:
            print("\nThe request was invalid. Common reasons:")
            print("- The branch 'main' doesn't exist")
            print("- The path '/frontend/dist-github' doesn't exist")
            print("- GitHub Pages might already be enabled")
            print("- The repository might need to be public")

def main():
    if len(sys.argv) != 2:
        print("Error: GitHub token required")
        print(f"Usage: {sys.argv[0]} <github-token>")
        print("\nTo create a personal access token:")
        print("1. Go to https://github.com/settings/tokens")
        print("2. Click 'Generate new token (classic)'")
        print("3. Give it a name and select the 'repo' scope")
        print("4. Click 'Generate token' and copy the token")
        sys.exit(1)
    
    token = sys.argv[1]
    enable_github_pages(token)

if __name__ == "__main__":
    main()