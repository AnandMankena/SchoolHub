import pytest
import requests
import os
from pathlib import Path

@pytest.fixture(scope="session")
def base_url():
    """Get base URL from environment or frontend .env"""
    # Try environment variable first
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    
    # If not found, read from frontend/.env
    if not url:
        env_file = Path('/app/frontend/.env')
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    url = line.split('=', 1)[1].strip().strip('"')
                    break
    
    if not url:
        raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment or frontend/.env")
    
    return url.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def principal_token(base_url, api_client):
    """Login as principal and return token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "principal@school.com",
        "password": "Admin@123"
    })
    if response.status_code != 200:
        pytest.skip(f"Principal login failed: {response.text}")
    data = response.json()
    return data.get("token")

@pytest.fixture
def auth_headers(principal_token):
    """Headers with principal auth token"""
    return {"Authorization": f"Bearer {principal_token}"}
