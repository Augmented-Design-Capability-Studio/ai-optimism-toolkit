import uvicorn
import subprocess
import os
import atexit
import signal
import sys
import time
import requests
import threading
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Load .env.local to override (for local development)
env_local_path = Path(__file__).parent / '.env.local'
load_dotenv(env_local_path, override=True)

cloudflared_process = None
cloudflared_monitor_thread = None
cloudflared_tunnel_name = None
monitor_running = False

def cleanup_cloudflared_tunnel():
    """Stop Cloudflare tunnel process on exit"""
    global cloudflared_process, monitor_running, cloudflared_monitor_thread
    monitor_running = False
    
    # Wait for monitor thread to stop (with timeout)
    if cloudflared_monitor_thread and cloudflared_monitor_thread.is_alive():
        print("[cloudflared] Stopping health monitor...")
        cloudflared_monitor_thread.join(timeout=2)
    
    if cloudflared_process:
        print("\n[cloudflared] Stopping Cloudflare tunnel...")
        cloudflared_process.terminate()
        try:
            cloudflared_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cloudflared_process.kill()
        print("[cloudflared] Tunnel stopped")

def monitor_cloudflared_health(tunnel_name: str, tunnel_domain: str = None, check_interval=30):
    """Background thread to monitor Cloudflare tunnel health and restart if needed"""
    global cloudflared_process, monitor_running, cloudflared_tunnel_name
    
    print(f"[cloudflared] Health monitor started (checking every {check_interval}s)")
    
    consecutive_failures = 0
    max_failures = 2  # Restart after 2 consecutive failures
    
    while monitor_running:
        try:
            time.sleep(check_interval)
            
            if not monitor_running:
                break
            
            # Check if process is still running
            if cloudflared_process and cloudflared_process.poll() is not None:
                print("[cloudflared] ⚠ Process terminated, restarting...")
                cloudflared_process = None
                start_cloudflared_tunnel(tunnel_name, tunnel_domain, force_restart=True)
                consecutive_failures = 0
                continue
            
            # Check if tunnel is responding (if domain is provided)
            if tunnel_domain:
                if check_cloudflared_tunnel_health(tunnel_domain, max_retries=1, retry_delay=0.2):
                    consecutive_failures = 0
                    # Only log success occasionally to avoid spam
                    if time.time() % 300 < check_interval:  # Every ~5 minutes
                        print("[cloudflared] ✓ Tunnel health check passed")
                else:
                    consecutive_failures += 1
                    print(f"[cloudflared] ⚠ Health check failed ({consecutive_failures}/{max_failures})")
                    
                    if consecutive_failures >= max_failures:
                        print("[cloudflared] 🔄 Restarting tunnel due to repeated health check failures...")
                        cleanup_cloudflared_tunnel()
                        time.sleep(1)
                        start_cloudflared_tunnel(tunnel_name, tunnel_domain, force_restart=True)
                        consecutive_failures = 0
            else:
                # Without domain, just check if process is alive
                if cloudflared_process and cloudflared_process.poll() is None:
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        print("[cloudflared] 🔄 Restarting tunnel...")
                        cleanup_cloudflared_tunnel()
                        time.sleep(1)
                        start_cloudflared_tunnel(tunnel_name, tunnel_domain, force_restart=True)
                        consecutive_failures = 0
                    
        except Exception as e:
            print(f"[cloudflared] Error in health monitor: {e}")
            time.sleep(check_interval)
    
    print("[cloudflared] Health monitor stopped")

def check_cloudflared_installed():
    """Check if cloudflared is installed and available"""
    try:
        result = subprocess.run(
            ['cloudflared', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        return False

def check_cloudflared_tunnel_health(domain: str, max_retries=3, retry_delay=0.5):
    """Check if Cloudflare tunnel is actually responding"""
    if not domain:
        return False
    
    for _ in range(max_retries):
        try:
            # Try to hit the health endpoint through the tunnel
            health_url = f"https://{domain}/health"
            response = requests.get(health_url, timeout=2)
            if response.status_code == 200:
                return True
        except requests.RequestException:
            if _ < max_retries - 1:
                time.sleep(retry_delay)
    
    return False

def print_cloudflared_info(tunnel_name: str, tunnel_domain: str = None):
    """Print Cloudflare tunnel information in a prominent, visible format"""
    print("\n" + "=" * 70)
    print(" " * 18 + "🌐 CLOUDFLARE TUNNEL ACTIVE")
    print("=" * 70)
    print(f"  Tunnel Name: {tunnel_name}")
    if tunnel_domain:
        print(f"  Domain:      {tunnel_domain}")
        print(f"  Public URL:  https://{tunnel_domain}")
    else:
        print(f"  Public URL:  (configure domain in .env for custom domain)")
    print("=" * 70 + "\n")

def start_cloudflared_tunnel(tunnel_name: str, tunnel_domain: str = None, force_restart=False):
    """Start Cloudflare tunnel in background"""
    global cloudflared_process
    
    # If there's an existing process and we're not forcing restart, check if it's still alive
    if cloudflared_process and not force_restart:
        if cloudflared_process.poll() is None:  # Process is still running
            # Check if tunnel is actually working (if domain is provided)
            if tunnel_domain and check_cloudflared_tunnel_health(tunnel_domain, max_retries=1):
                print(f"[cloudflared] Tunnel already running and healthy: https://{tunnel_domain}")
                return cloudflared_process
            elif not tunnel_domain:
                # Without domain, just check if process is alive
                print("[cloudflared] Tunnel already running")
                return cloudflared_process
            else:
                print("[cloudflared] Existing tunnel appears closed, restarting...")
                cleanup_cloudflared_tunnel()
        else:
            print("[cloudflared] Previous tunnel process terminated, restarting...")
            cloudflared_process = None
    
    if not tunnel_name:
        return None
    
    # Check if cloudflared is installed
    if not check_cloudflared_installed():
        print("\n[cloudflared] WARNING: cloudflared not found!")
        print("[cloudflared] Please install cloudflared:")
        print("[cloudflared]   macOS: brew install cloudflare/cloudflare/cloudflared")
        print("[cloudflared]   Linux: Download from https://github.com/cloudflare/cloudflared/releases")
        print("[cloudflared]   Windows: Download from https://github.com/cloudflare/cloudflared/releases")
        print("[cloudflared] Skipping automatic tunnel startup...\n")
        return None
    
    print(f"[cloudflared] Starting tunnel: {tunnel_name}")
    if tunnel_domain:
        print(f"[cloudflared] Domain: {tunnel_domain}")
    
    try:
        # Start cloudflared tunnel as a subprocess
        # Use tunnel run command which reads from default config location
        cloudflared_process = subprocess.Popen(
            ['cloudflared', 'tunnel', 'run', tunnel_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for tunnel to initialize
        time.sleep(1.0)
        
        # Verify tunnel is actually working (if domain is provided)
        if tunnel_domain:
            print("[cloudflared] Verifying tunnel health...")
            if check_cloudflared_tunnel_health(tunnel_domain, max_retries=2, retry_delay=0.5):
                print("[cloudflared] ✓ Tunnel is healthy and responding")
            else:
                print("[cloudflared] ⚠ WARNING: Tunnel started but initial health check failed")
                print("[cloudflared] Background monitor will retry. If issues persist, verify DNS is configured.")
        else:
            print("[cloudflared] ✓ Tunnel process started (no domain configured for health check)")
        
        # Print prominent info
        print_cloudflared_info(tunnel_name, tunnel_domain)
        print(f"[cloudflared] Process ID: {cloudflared_process.pid}\n")
        return cloudflared_process
    except FileNotFoundError:
        print("[cloudflared] ERROR: cloudflared not found. Make sure cloudflared is installed and in your PATH.")
        print("[cloudflared] Install instructions: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/\n")
        return None
    except Exception as e:
        print(f"[cloudflared] ERROR: Failed to start tunnel: {e}\n")
        return None

if __name__ == "__main__":
    # Register cleanup function
    atexit.register(cleanup_cloudflared_tunnel)
    
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        cleanup_cloudflared_tunnel()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check for Cloudflare tunnel configuration in environment
    tunnel_name = os.getenv('CLOUDFLARE_TUNNEL_NAME', '').strip()
    tunnel_domain = os.getenv('CLOUDFLARE_TUNNEL_DOMAIN', '').strip()
    tunnel_url = None
    
    if tunnel_name:
        cloudflared_tunnel_name = tunnel_name
        # Force restart to ensure a fresh connection
        process = start_cloudflared_tunnel(tunnel_name, tunnel_domain if tunnel_domain else None, force_restart=True)
        if process:
            # Construct URL if domain is provided
            if tunnel_domain:
                tunnel_url = f"https://{tunnel_domain}"
                print(f"[cloudflared] Tunnel URL confirmed: {tunnel_url}")
            
            # Start health monitor in background thread
            monitor_running = True
            cloudflared_monitor_thread = threading.Thread(
                target=monitor_cloudflared_health,
                args=(tunnel_name, tunnel_domain if tunnel_domain else None),
                daemon=True,
                name="cloudflared-health-monitor"
            )
            cloudflared_monitor_thread.start()
        else:
            print("[cloudflared] WARNING: Failed to start Cloudflare tunnel")
    else:
        print("[cloudflared] No CLOUDFLARE_TUNNEL_NAME set in .env - skipping automatic tunnel startup")
        print("[cloudflared] To enable: Set CLOUDFLARE_TUNNEL_NAME=aiopt in ai_optimism/backend/.env")
        print("[cloudflared] Optional: Set CLOUDFLARE_TUNNEL_DOMAIN=your-domain.com for custom domain\n")
    
    # Print tunnel info again right before server starts (so it's visible above uvicorn output)
    if tunnel_url:
        print("\n" + "=" * 70)
        print(" " * 12 + "🚀 BACKEND STARTING - CLOUDFLARE TUNNEL URL:")
        print("=" * 70)
        print(f"  {tunnel_url}")
        print("=" * 70 + "\n")
    
    # Get local IP addresses for helpful startup message
    def get_local_ip():
        """Get the local IP address of this machine"""
        try:
            # Connect to a remote address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0)
            try:
                # Doesn't actually connect, just determines local IP
                s.connect(('8.8.8.8', 80))
                ip = s.getsockname()[0]
            except Exception:
                ip = '127.0.0.1'
            finally:
                s.close()
            return ip
        except Exception:
            return '127.0.0.1'
    
    local_ip = get_local_ip()
    
    # Start the FastAPI server with custom log format including timestamps
    print("[Backend] Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                },
                "access": {
                    "format": "%(asctime)s | %(levelname)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                },
            },
            "handlers": {
                "default": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
                "access": {
                    "formatter": "access",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
            },
            "loggers": {
                "uvicorn": {"handlers": ["default"], "level": "INFO"},
                "uvicorn.error": {"handlers": ["default"], "level": "INFO"},
                "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
            },
        }
    )