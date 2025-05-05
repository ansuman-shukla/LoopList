#!/bin/bash

# Deploy script for LoopList

# Set environment variables
echo "Setting environment variables..."
echo "VITE_API_URL=https://looplist.onrender.com/api/v1" > frontend/.env.production

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the app
echo "Building the app..."
npm run build

# Deploy to GitHub Pages
echo "Deploying to GitHub Pages..."
npm run deploy

echo "Deployment complete! Your app should be available at your GitHub Pages URL."
