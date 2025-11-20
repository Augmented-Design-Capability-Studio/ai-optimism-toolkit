# Deployment Guide

This guide covers deploying the AI Optimism Toolkit with separate frontend and backend hosting.

## Architecture

- **Frontend**: Next.js app (deployed to Vercel)
- **Backend**: FastAPI Python server (deployed separately)

## Frontend Deployment (Vercel)

### 1. Prepare Your Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `ai_optimism/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Set Environment Variables

In Vercel project settings, add:

```
NEXT_PUBLIC_RESEARCHER_PASSWORD=your_secure_password_here
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### 4. Deploy

Click "Deploy" and Vercel will build and host your frontend.

## Backend Deployment Options

### Option 1: Render (Recommended for Students - Free Tier)

**Pros**: Easy setup, free tier, good for FastAPI
**Cons**: Spins down after inactivity (cold starts)

#### Steps:

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ai-optimism-backend`
   - **Root Directory**: `ai_optimism/backend`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. Add environment variables if needed
6. Click "Create Web Service"

Your backend will be available at: `https://ai-optimism-backend.onrender.com`

### Option 2: Fly.io (More Flexible)

**Pros**: Better free tier, stays awake, Docker support
**Cons**: Slightly more complex setup

#### Steps:

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login and create app:
   ```bash
   cd ai_optimism/backend
   fly auth login
   fly launch
   ```

3. Follow the prompts (it will detect your Python app)

4. Deploy:
   ```bash
   fly deploy
   ```

### Option 3: Railway (Student Credits)

**Pros**: $5/month credit, easy setup
**Cons**: Requires credit card

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Configure root directory: `ai_optimism/backend`
6. Railway auto-detects Python and deploys

### Option 4: PythonAnywhere (Traditional Hosting)

**Pros**: Simple, Python-focused
**Cons**: More manual configuration

1. Sign up at [pythonanywhere.com](https://www.pythonanywhere.com)
2. Upload your code or clone from GitHub
3. Set up a web app with WSGI configuration
4. Configure virtual environment and dependencies

## Connecting Frontend to Backend

After deploying both:

1. Update Vercel environment variable:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

2. Update backend CORS settings in `ai_optimism/backend/app/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "https://your-vercel-app.vercel.app",
           "https://your-custom-domain.com",
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. Redeploy both services

## Security Considerations

### Researcher Dashboard Protection

The researcher dashboard is protected by a simple password (set via `NEXT_PUBLIC_RESEARCHER_PASSWORD`).

**For production**, consider:
- Using a strong, randomly generated password
- Implementing proper authentication (OAuth, JWT)
- Adding IP whitelisting
- Using environment-specific passwords

### API Keys

- Never commit API keys to Git
- Use environment variables for all secrets
- Rotate keys regularly
- Use different keys for development and production

## Monitoring

### Vercel
- Built-in analytics and logs
- Real-time deployment status
- Automatic HTTPS

### Backend (Render/Fly.io)
- Check logs via dashboard
- Set up health checks
- Monitor resource usage

## Troubleshooting

### Frontend can't connect to backend
1. Check CORS settings in backend
2. Verify `NEXT_PUBLIC_BACKEND_URL` is correct
3. Check backend is running (visit health endpoint)

### Backend cold starts (Render free tier)
- First request after inactivity takes ~30s
- Consider upgrading to paid tier or using Fly.io

### Build failures
1. Check Node.js version (should be 18+)
2. Verify all dependencies are in package.json
3. Check build logs for specific errors

## Cost Estimate

**Free Tier (Student)**:
- Vercel: Free (generous limits)
- Render: Free (with cold starts)
- Total: $0/month

**Recommended Paid**:
- Vercel: Free
- Render: $7/month (no cold starts)
- Total: $7/month

**With Credits**:
- Railway: $5/month credit (free for students)
- Fly.io: Free tier + $5 credit
- GCP/AWS: $300+ student credits

## Next Steps

1. Deploy frontend to Vercel
2. Deploy backend to Render (or your choice)
3. Update environment variables
4. Test the connection
5. Set up custom domain (optional)
6. Configure monitoring and alerts

## Support

For issues:
1. Check deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Review CORS configuration
