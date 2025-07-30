#!/usr/bin/env python3
"""Complete debugging of the dashboard loading issue"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login and get token"""
    print("=== Testing Login ===")
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": "asemu93@hotmail.com", "password": "newpassword123"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Login successful!")
        print(f"Token: {data.get('access_token', 'NO TOKEN')[:50]}...")
        return data.get('access_token')
    else:
        print(f"Login failed: {response.text}")
        return None

def test_files_endpoint(token):
    """Test files endpoint"""
    print("\n=== Testing Files Endpoint ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/files/", headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Files endpoint working!")
        print(f"Response keys: {list(data.keys())}")
        return True
    else:
        print(f"Files endpoint failed: {response.text}")
        return False

def test_plans_endpoint(token):
    """Test plans endpoint"""
    print("\n=== Testing Plans Endpoint ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/plans/current", headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Plans endpoint working!")
        print(f"Response keys: {list(data.keys())}")
        return True
    else:
        print(f"Plans endpoint failed: {response.text}")
        return False

def test_account_endpoint(token):
    """Test account endpoint"""
    print("\n=== Testing Account Endpoint ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/account/", headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Account endpoint working!")
        print(f"User: {data.get('email')}")
        return True
    else:
        print(f"Account endpoint failed: {response.text}")
        return False

def main():
    print("FileShare Dashboard Debug Tool")
    print("=" * 50)
    
    # Test login
    token = test_login()
    if not token:
        print("\n❌ Login failed - cannot proceed")
        return
    
    # Test all endpoints
    files_ok = test_files_endpoint(token)
    plans_ok = test_plans_endpoint(token)
    account_ok = test_account_endpoint(token)
    
    print("\n" + "=" * 50)
    print("Summary:")
    print(f"✅ Login: Working" if token else "❌ Login: Failed")
    print(f"{'✅' if files_ok else '❌'} Files endpoint: {'Working' if files_ok else 'Failed'}")
    print(f"{'✅' if plans_ok else '❌'} Plans endpoint: {'Working' if plans_ok else 'Failed'}")
    print(f"{'✅' if account_ok else '❌'} Account endpoint: {'Working' if account_ok else 'Failed'}")

if __name__ == "__main__":
    main()