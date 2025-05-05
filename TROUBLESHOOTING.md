# Troubleshooting LoopList Deployment

This guide provides solutions for common issues you might encounter when deploying LoopList to GitHub Pages.

## API Connection Issues

### 404 Not Found Errors

If you're seeing 404 errors when trying to access API endpoints:

1. **Check the API URL configuration**:
   - Make sure the `VITE_API_URL` in `.env.production` is set correctly:
     ```
     VITE_API_URL=https://looplist.onrender.com/api/v1
     ```
   - Verify that your backend API is running and accessible at this URL

2. **Verify API endpoints**:
   - Make sure the API endpoints in your frontend code match the endpoints in your backend API
   - For authentication, the endpoints should be:
     - Login: `/auth/login`
     - Signup: `/auth/signup`

3. **Check for CORS issues**:
   - If you're seeing CORS errors in the console, make sure your backend API allows requests from your GitHub Pages domain
   - Add your GitHub Pages domain to the CORS allowed origins in your backend API

### Authentication Issues

If you're having trouble logging in:

1. **Check localStorage**:
   - Open your browser's developer tools
   - Go to the Application tab
   - Check if the token is being stored in localStorage

2. **Check redirect URLs**:
   - Make sure redirect URLs are using the hash format (`/#/login`) for GitHub Pages

3. **Check token expiration**:
   - If your token is expiring too quickly, you might need to adjust the expiration time in your backend API

## Routing Issues

If you're seeing 404 errors when navigating to different pages:

1. **Make sure you're using HashRouter**:
   - GitHub Pages works best with HashRouter for client-side routing
   - Verify that your App.jsx is using HashRouter instead of BrowserRouter

2. **Check base path**:
   - Make sure the `base` path in `vite.config.js` matches your repository name

## Deployment Issues

If your deployment is failing:

1. **Check GitHub Actions logs**:
   - Go to the Actions tab in your GitHub repository
   - Check the logs for any build or deployment errors

2. **Verify GitHub Pages settings**:
   - Go to Settings > Pages in your GitHub repository
   - Make sure the source is set to the gh-pages branch

3. **Try manual deployment**:
   - Run the `deploy.sh` script to manually deploy your app

## Testing Your Deployment

To test your deployment:

1. **Clear browser cache**:
   - Press Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
   - Select "Cached images and files" and clear them

2. **Use incognito/private browsing**:
   - This ensures you're testing with a clean slate

3. **Check console for errors**:
   - Open your browser's developer tools (F12 or Ctrl+Shift+I)
   - Go to the Console tab to see any errors

## Still Having Issues?

If you're still experiencing problems:

1. **Compare local and deployed versions**:
   - Run the app locally with `npm run dev`
   - Compare the behavior with the deployed version
   - Look for differences in the network requests

2. **Check environment variables**:
   - Make sure environment variables are being correctly applied during the build process

3. **Verify backend API**:
   - Test your backend API endpoints directly using a tool like Postman or curl
   - Make sure they're working as expected
