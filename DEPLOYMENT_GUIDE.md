# Chess Club Website - Deployment and Bug Fix Guide

## Overview
This guide explains the fixes applied to resolve the three main issues and how to properly deploy the application.

## Bugs Fixed

### 1. ✅ Member Registration: "Unable to connect" Error
**Issue**: Users couldn't register due to CORS misconfiguration
**Fix**: Moved CORS middleware before router inclusion in FastAPI

### 2. ✅ Members Page: Nothing Shows When Clicking Members Tab
**Issue**: Frontend was not extracting the `members` array from the API response object
**Fix**: Updated AdminDashboard to properly extract nested data from API responses

### 3. ✅ Admin Token Expiration: Can't Add/Remove Members
**Issue**: Token expiration wasn't handled gracefully, causing "token expired" errors
**Fix**: 
- Added automatic token cleanup on 401 errors in API client
- Improved error handling in AdminDashboard to detect auth errors and redirect to login
- Clear localStorage tokens when authentication fails

## Deployment Instructions

### Backend Deployment (Render)

1. **Set Environment Variables in Render Dashboard**:
   ```
   MONGO_URL=mongodb+srv://your_username:your_password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
   DB_NAME=chess_club_db
   CORS_ORIGINS=https://your-frontend.vercel.app
   JWT_SECRET=your_secure_random_string_here
   ```

   **Important**: 
   - Use your actual MongoDB Atlas connection string for `MONGO_URL`
   - Replace `your-frontend.vercel.app` with your actual Vercel domain
   - Generate a secure JWT_SECRET: `python -c "import secrets; print(secrets.token_hex(32))"`

2. **Verify Deployment**:
   - After deployment, test the API endpoint: `https://your-backend.onrender.com/api/members`
   - It should return a JSON response with members data

### Frontend Deployment (Vercel)

1. **Set Environment Variables in Vercel Dashboard**:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.onrender.com
   WDS_SOCKET_PORT=443
   ENABLE_HEALTH_CHECK=false
   ```

   **Important**: Replace `your-backend.onrender.com` with your actual Render backend URL

2. **Redeploy Frontend**:
   - Push changes to GitHub
   - Vercel will automatically redeploy
   - Or manually trigger deployment from Vercel dashboard

### MongoDB Setup

Ensure your MongoDB Atlas cluster:
1. Has a database user with read/write permissions
2. Network access allows connections from anywhere (0.0.0.0/0) or specific Render IPs
3. Connection string is correctly formatted in Render environment variables

## Testing the Fixes

### Test 1: Member Registration
1. Go to your frontend URL
2. Click "Join the Club" or navigate to `/member/register`
3. Fill in all required fields with a valid Chess.com username
4. Submit the form
5. ✅ You should see "Registration successful!" and be redirected to member dashboard

### Test 2: Members Page
1. Navigate to `/members` on your frontend
2. ✅ You should see a grid of member cards with their ratings
3. Search and filter functions should work properly

### Test 3: Admin Operations
1. Login to admin dashboard at `/admin/login`
2. Try to add a new member
3. Try to delete a member
4. Try to refresh ratings
5. ✅ All operations should work without "token expired" errors
6. If your session actually expires (after 24 hours), you should be gracefully redirected to login

## Common Issues and Solutions

### Issue: "Unable to connect to server"
**Solution**: 
- Check that `REACT_APP_BACKEND_URL` in Vercel matches your Render backend URL
- Verify backend is running on Render
- Check Render logs for errors

### Issue: CORS errors in browser console
**Solution**:
- Ensure `CORS_ORIGINS` in Render includes your Vercel domain
- Format: `https://your-frontend.vercel.app` (no trailing slash)
- Can use multiple origins: `https://app1.vercel.app,https://app2.vercel.app`

### Issue: "Token expired" immediately after login
**Solution**:
- Verify `JWT_SECRET` is set in Render environment variables
- Check server time is correct (shouldn't be an issue on Render)

### Issue: Members page shows empty
**Solution**:
- Check MongoDB connection is working
- Add some test members through admin dashboard
- Verify API endpoint returns data: `curl https://your-backend.onrender.com/api/members`

## Keeping Backend Alive

You mentioned using UptimeRobot to ping the backend every 10 minutes. This is good! Make sure:
- The ping URL is: `https://your-backend.onrender.com/api/members` or any public endpoint
- Ping interval is 10 minutes or less
- HTTP/HTTPS monitor type is selected

## Code Changes Summary

### Backend (`server.py`)
- Moved CORS middleware before router inclusion (critical for proper CORS handling)

### Frontend (`lib/api.js`)
- Added automatic token cleanup on 401 errors
- Clear both admin and member tokens when authentication fails

### Frontend (`pages/AdminDashboard.jsx`)
- Improved error handling to properly detect auth errors
- Extract nested data from API responses (members, tournaments, etc.)
- Added consistent token expiration handling across all operations
- Show toast notifications for better user feedback

## Next Steps

1. Push these changes to GitHub
2. Update environment variables in Render and Vercel dashboards
3. Wait for automatic deployments to complete
4. Test all three fixed issues
5. Create your first admin account if needed:
   ```bash
   # Use the admin register endpoint
   curl -X POST https://your-backend.onrender.com/api/admin/register \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"securepassword","email":"admin@example.com"}'
   ```

## Support

If you encounter any issues after deployment:
1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB Atlas network access is configured properly
