import uvicorn
import subprocess
import os
import atexit
import signal
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

ngrok_process = None

def cleanup_ngrok():
    """Stop ngrok process on exit"""
    global ngrok_process
    if ngrok_process:
        print("\n[ngrok] Stopping ngrok tunnel...")
        ngrok_process.terminate()
        try:
            ngrok_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            ngrok_process.kill()
        print("[ngrok] Tunnel stopped")

def check_ngrok_authtoken():
    """Check if ngrok authtoken is configured"""
    try:
        # Run ngrok config check to verify authtoken is set
        result = subprocess.run(
            ['ngrok', 'config', 'check'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        # If command succeeds, authtoken is configured
        if result.returncode == 0:
            return True
        return False
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        # If ngrok isn't installed or command fails, assume not configured
        return False

def get_ngrok_url(max_retries=5, retry_delay=0.2):
    """Get the public ngrok URL from the local API"""
    for _ in range(max_retries):
        try:
            response = requests.get('http://127.0.0.1:4040/api/tunnels', timeout=1)
            if response.status_code == 200:
                data = response.json()
                tunnels = data.get('tunnels', [])
                if tunnels:
                    # Get the first HTTPS tunnel (preferred) or first tunnel
                    https_tunnel = next((t for t in tunnels if t.get('proto') == 'https'), None)
                    tunnel = https_tunnel or tunnels[0]
                    return tunnel.get('public_url')
        except (requests.RequestException, KeyError, IndexError):
            if _ < max_retries - 1:  # Don't sleep on last iteration
                time.sleep(retry_delay)
    return None

def print_ngrok_info(domain: str, public_url: str = None):
    """Print ngrok information in a prominent, visible format"""
    print("\n" + "=" * 70)
    print(" " * 20 + "🌐 NGROK TUNNEL ACTIVE")
    print("=" * 70)
    print(f"  Domain:     {domain}")
    if public_url:
        print(f"  Public URL: {public_url}")
    else:
        print(f"  Public URL: https://{domain}")
    print("=" * 70 + "\n")

def start_ngrok(domain: str):
    """Start ngrok tunnel in background"""
    global ngrok_process
    if not domain:
        return None
    
    # Check if authtoken is configured
    if not check_ngrok_authtoken():
        print("\n[ngrok] WARNING: ngrok authtoken not configured!")
        print("[ngrok] Please run: ngrok config add-authtoken YOUR_AUTHTOKEN")
        print("[ngrok] Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken")
        print("[ngrok] Skipping automatic ngrok startup...\n")
        return None
    
    print(f"[ngrok] Starting tunnel with domain: {domain}")
    try:
        # Start ngrok as a subprocess
        ngrok_process = subprocess.Popen(
            ['ngrok', 'http', '8000', '--domain', domain],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Brief wait for ngrok to initialize (reduced from 1.5s)
        time.sleep(0.3)
        
        # Try to get the actual public URL from ngrok API (with quick retries)
        public_url = get_ngrok_url(max_retries=3, retry_delay=0.2)
        
        # Print prominent info (use domain if URL not ready yet)
        print_ngrok_info(domain, public_url)
        print(f"[ngrok] Process ID: {ngrok_process.pid}\n")
        return ngrok_process
    except FileNotFoundError:
        print("[ngrok] ERROR: ngrok not found. Make sure ngrok is installed and in your PATH.")
        print("[ngrok] Install with: winget install ngrok.ngrok\n")
        return None
    except Exception as e:
        print(f"[ngrok] ERROR: Failed to start tunnel: {e}\n")
        return None

if __name__ == "__main__":
    # Register cleanup function
    atexit.register(cleanup_ngrok)
    
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        cleanup_ngrok()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check for ngrok domain in environment
    ngrok_domain = os.getenv('NGROK_DOMAIN', '').strip()
    ngrok_url = None
    
    if ngrok_domain:
        process = start_ngrok(ngrok_domain)
        if process:
            # Try to get the URL one more time (quick, non-blocking)
            ngrok_url = get_ngrok_url(max_retries=2, retry_delay=0.1) or f"https://{ngrok_domain}"
    else:
        print("[ngrok] No NGROK_DOMAIN set in .env - skipping automatic ngrok startup")
        print("[ngrok] To enable: Set NGROK_DOMAIN=your-domain.ngrok-free.app in ai_optimism/backend/.env\n")
    
    # Print ngrok info again right before server starts (so it's visible above uvicorn output)
    if ngrok_url:
        print("\n" + "=" * 70)
        print(" " * 15 + "🚀 BACKEND STARTING - NGROK URL:")
        print("=" * 70)
        print(f"  {ngrok_url}")
        print("=" * 70 + "\n")
    
    # Start the FastAPI server
    print("[Backend] Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)