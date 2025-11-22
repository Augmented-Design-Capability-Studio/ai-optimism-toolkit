<!-- 5154f04a-4d41-43d8-97e4-b76f699f4fad 23432be8-1db8-4200-a347-d0e1431f9547 -->
# Raspberry Pi 4 Backend Deployment Guide

## Assessment Summary

**Feasibility**: ✅ Yes, Raspberry Pi 4 can run the backend successfully

**Computational Load**: Light to moderate

- Default optimization: ~50 population × 100 iterations = ~5,000 evaluations
- Simple Python expression evaluation (no ML models)
- FastAPI web server (lightweight)
- SQLite database (file-based, low overhead)

**Recommended RPi 4 Specs**:

- RAM: 4GB or 8GB (2GB minimum)
- Storage: Use SSD via USB for better database performance
- Network: Wired Ethernet preferred for stability

## Network Options Comparison

### Option 1: ngrok (Recommended for Testing)

**Pros**:

- Easiest setup (5 minutes)
- Works behind NAT/firewall
- HTTPS automatically
- Free tier available

**Cons**:

- Free tier: URL changes on restart, connection limits
- Paid tier: $8/month for static domain
- Not ideal for production

**Setup Steps**:

1. Install ngrok on RPi 4
2. Get free account at ngrok.com
3. Configure auth token
4. Start tunnel: `ngrok http 8000`
5. Update frontend `NEXT_PUBLIC_BACKEND_URL` with ngrok URL

### Option 2: University Network Direct Access

**Pros**:

- No additional services needed
- Potentially fastest connection
- Free

**Cons**:

- May require port forwarding/opening
- May require static IP reservation
- May need IT department approval
- Security considerations (exposing internal network)

**Setup Requirements**:

- Check if RPi 4 gets public IP or is behind NAT
- Request port 8000 to be opened (if behind firewall)
- Reserve static IP (if DHCP)
- Consider VPN if available

### Option 3: SSH Tunnel (Alternative to ngrok)

**Pros**:

- No external service needed
- More secure than direct exposure
- Free
- Works through university VPN

**Cons**:

- Requires accessible SSH server (middle machine)
- More complex setup
- Connection must stay open

**Setup**: Forward port through SSH server accessible from internet

### Option 4: Cloud Deployment (Recommended for Production)

**Pros**:

- Reliable uptime
- Better performance
- HTTPS/domain included
- No network configuration needed

**Cons**:

- Potential costs (though free tiers available)
- Not using RPi 4

**Alternatives**: Render, Fly.io, Railway (see DEPLOYMENT.md)

## Performance Optimization for RPi 4

1. **Use SSD via USB**: Better SQLite performance than microSD
2. **Reduce optimization parameters** for testing:

- population_size: 20-30 (default 50)
- max_iterations: 50-100 (default 100)

3. **Monitor temperature**: Add cooling if running intensive workloads
4. **Use systemd service**: Auto-restart on reboot
5. **Consider overclocking**: If stable (1.8GHz → 2.0GHz)

## Implementation Steps

### Step 1: Prepare RPi 4

1. Install Python 3.9+ and dependencies
2. Clone repository
3. Install requirements: `pip install -r requirements.txt`
4. Test locally: `python run.py`

### Step 2: Choose Network Method

- **Quick testing**: Set up ngrok
- **University network**: Check network access and configure port
- **Production**: Consider cloud deployment

### Step 3: Configure Backend

1. Update `ai_optimism/backend/app/main.py` CORS settings
2. Set environment variables if needed
3. Configure systemd service for auto-start

### Step 4: Update Frontend

1. Set `NEXT_PUBLIC_BACKEND_URL` to RPi 4 URL (ngrok or direct)
2. Redeploy frontend if needed

## Files to Modify

- `ai_optimism/backend/app/main.py`: CORS configuration
- `ai_optimism/backend/run.py`: Optional production settings (remove reload)
- Create systemd service file for auto-start
- Create ngrok configuration (if using ngrok)

## Recommendations

**For Development/Testing**:

- Use ngrok for quick setup
- RPi 4 is perfectly adequate

**For Production/Public Access**:

- Consider cloud deployment (Render, Fly.io) for reliability
- Or: Use university network if properly secured with static IP
- Or: Use ngrok paid tier for static domain

**For Best Performance**:

- Use RPi 4 4GB+ model
- Use SSD storage via USB
- Wired Ethernet connection
- Consider cooling for intensive runs

### To-dos

- [ ] Review backend computational requirements and RPi 4 compatibility
- [ ] Create ngrok setup instructions and configuration file template
- [ ] Create systemd service file for auto-starting backend on RPi 4
- [ ] Create network configuration guide (ngrok, SSH tunnel, direct access)
- [ ] Add RPi 4 optimized default configuration options