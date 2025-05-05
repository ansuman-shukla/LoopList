# Deploying LoopList to GitHub Pages

This document provides instructions for deploying the LoopList frontend to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your local machine
- Node.js and npm installed on your local machine

## Setup

1. **Update Repository Information**

   Update the `homepage` and `repository` fields in `frontend/package.json` with your actual GitHub username and repository name:

   ```json
   "homepage": "https://your-username.github.io/looplist",
   "repository": {
     "type": "git",
     "url": "git+https://github.com/your-username/looplist.git"
   }
   ```

2. **Update Base Path in Vite Config**

   Make sure the `base` path in `frontend/vite.config.js` matches your repository name:

   ```javascript
   base: '/looplist/', // Replace 'looplist' with your repository name
   ```

3. **Configure Backend API URL**

   Update the `VITE_API_URL` in `frontend/.env.production` to point to your deployed backend API:

   ```
   VITE_API_URL=https://your-backend-api-url.com/api/v1
   ```

## Manual Deployment

To manually deploy the app to GitHub Pages:

1. Build the app:
   ```
   cd frontend
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```

This will create a `gh-pages` branch in your repository and push the built app to it.

## Automatic Deployment with GitHub Actions

This repository is configured to automatically deploy to GitHub Pages whenever you push to the main branch.

1. Push your changes to the main branch:
   ```
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. GitHub Actions will automatically build and deploy your app to the `gh-pages` branch.

3. Your app will be available at `https://your-username.github.io/looplist`.

## Troubleshooting

- If your app is not loading correctly, check the browser console for errors.
- Make sure your backend API is accessible from your deployed frontend.
- If you're seeing 404 errors for your routes, make sure you're using HashRouter in your React app.
- Check the GitHub Actions logs for any build or deployment errors.
