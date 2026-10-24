# ⚡ Aether — 24/7 Cloud Deployment Guide (100% Free)

This guide explains how to host your Aether Autonomous Personal AI Executive online so it runs **24/7 continuously** even when your laptop is turned off.

---

## 🌟 Option 1: Render.com (Recommended — 100% Free, No Credit Card)

Render provides a completely free tier for Docker web services.

### 3-Step Setup:
1. **Sign up at Render**: Go to [render.com](https://render.com) and sign in with your GitHub account.
2. **Create New Web Service**:
   - Click **New +** → **Web Service**
   - Connect your GitHub repository: `PawanDixit23/aether`
   - Select branch: `dev`
   - Render will automatically detect the `Dockerfile`.
3. **Set Environment Variables**:
   - Under **Environment Variables**, add:
     - `GEMINI_API_KEY`: *(Your Google Gemini API key)*
     - `PORT`: `8000`
4. Click **Create Web Service**!

Render will build and deploy your app. Within 2 minutes, you will get a permanent public URL:
👉 `https://aether-ai-executive.onrender.com`

---

## 🌟 Option 2: Railway.app (Free Trial, Super Fast)

1. Go to [railway.app](https://railway.app) and login with GitHub.
2. Click **New Project** → **Deploy from GitHub repo** → select `aether`.
3. Under Variables, add `GEMINI_API_KEY`.
4. Click **Deploy**. Railway automatically detects the `Dockerfile` and gives you a public domain!

---

## 📱 Connecting Mobile App to your 24/7 Cloud Server

Once your cloud server is live:
1. Open the Aether Mobile App on your phone.
2. Tap the **Settings (Gear Icon)**.
3. Set Server URL to: `https://your-app-name.onrender.com`.
4. Now your mobile app and desktop app stay synchronized in real-time 24/7!
