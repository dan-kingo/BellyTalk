# BellyTalk Admin Panel

Admin web application for managing the BellyTalk platform.

## Features

- Admin Dashboard with platform overview statistics
- User Management (view, search, delete users)
- Role Request Management (approve/reject doctor and counselor requests)
- Activity Logs monitoring
- Dark/Light theme support
- Responsive design matching user-web UI/UX

## Setup

1. Install dependencies:
   npm install

2. Create .env file from .env.example:
   cp .env.example .env

3. Configure environment variables in .env:
   - VITE_SUPABASE_URL: Your Supabase project URL
   - VITE_SUPABASE_SUPABASE_ANON_KEY: Your Supabase anonymous key

4. Start development server:
   npm run dev

5. Build for production:
   npm run build

## Backend Integration

The admin panel integrates with the BellyTalk backend API at http://localhost:5000/api

Required backend endpoints:
- POST /auth/login - Admin authentication
- GET /profile/me - Get admin profile
- GET /admin/panel/overview - Dashboard statistics
- GET /admin/panel/users - List all users
- DELETE /admin/panel/users/:id - Delete user
- GET /admin/panel/logs - Activity logs
- GET /admin/roles/pending - List pending role requests
- POST /admin/roles/:id/approve - Approve role request
- POST /admin/roles/:id/reject - Reject role request

## Access

Only users with 'admin' role can access this panel.
Login with admin credentials created via backend seed script.
