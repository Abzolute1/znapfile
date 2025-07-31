#!/usr/bin/env python3
"""
Script to check GitHub Pages status for Abzolute1/znapfile repository
Usage: python check_github_pages.py <github-token>
"""

import sys
import json
import requests

def check_github_pages(token):
    """Check GitHub Pages status for the repository"""
    owner = "Abzolute1"
    repo = "znapfile"
    
    # GitHub API endpoint for Pages
    url = f"https://api.github.com/repos/{owner}/{repo}/pages"
    
    # Headers for authentication
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    
    print(f"Checking GitHub Pages status for {owner}/{repo}...")
    
    # Make the API request
    response = requests.get(url, headers=headers)
    
    # Handle the response
    if response.status_code == 200:
        result = response.json()
        print("\n✓ GitHub Pages is enabled!")
        print(f"\nCurrent configuration:")
        print(f"- URL: {result.get('html_url', 'N/A')}")
        print(f"- Custom domain: {result.get('cname', 'None')}")
        print(f"- Source branch: {result.get('source', {}).get('branch', 'N/A')}")
        print(f"- Source path: {result.get('source', {}).get('path', 'N/A')}")
        print(f"- Status: {result.get('status', 'N/A')}")
        
        if result.get('public') is False:
            print("\n⚠️  Warning: The site appears to be private")
        
        print(f"\nFull response:\n{json.dumps(result, indent=2)}")
    elif response.status_code == 404:
        print("\n✗ GitHub Pages is not enabled for this repository")
        print("\nTo enable it, run:")
        print(f"python enable_github_pages.py <github-token>")
    else:
        print(f"\n✗ Failed to check GitHub Pages status")
        print(f"HTTP Status Code: {response.status_code}")
        
        try:
            error_data = response.json()
            print(f"Response: {json.dumps(error_data, indent=2)}")
        except:
            print(f"Response: {response.text}")

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
    check_github_pages(token)

if __name__ == "__main__":
    main()