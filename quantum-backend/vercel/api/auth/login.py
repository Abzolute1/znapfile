from http.server import BaseHTTPRequestHandler
import json
import hashlib
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "quantum-secret-key"

# Mock user database
USERS = {
    "admin@znapfile.com": {
        "id": "admin-001",
        "email": "admin@znapfile.com",
        "username": "admin",
        "password_hash": "cd6357efdd966de8c0cb2f876cc89ec74ce35f0968e11743987084bd42fb8944",  # SecurePass123!
        "plan": "max"
    }
}

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user):
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'plan': user['plan'],
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            email = data.get('email', '').lower()
            password = data.get('password', '')
            
            user = USERS.get(email)
            if not user or hash_password(password) != user['password_hash']:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Invalid credentials'}).encode())
                return
            
            token = create_token(user)
            refresh_token = create_token(user)  # Simplified for demo
            
            response = {
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username'],
                    'plan': user['plan']
                },
                'access_token': token,
                'refresh_token': refresh_token
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())