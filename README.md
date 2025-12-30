# 🏠 HostelCare - Hostel Complaint Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e.svg)](https://supabase.com/)

A comprehensive digital hostel complaint management system with role-based access control, real-time tracking, and enterprise-grade security features. Built for CMT 322 Web Engineering project.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Security Features](#-security-features)
- [Session Management](#-session-management)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Running the Project](#-running-the-project)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Contributors](#-contributors)

## ✨ Features

### Student Portal

- 📝 **Complaint Submission**: Submit maintenance complaints with detailed descriptions
- 📊 **Ticket Tracking**: Real-time tracking of complaint status and resolution progress
- 💬 **Live Chat Support**: Direct communication with staff members
- 👤 **Profile Management**: Update personal information and view complaint history
- 🔔 **Real-time Notifications**: Get instant updates on complaint status changes

### Staff Portal

- 🎫 **Ticket Management**: View, assign, and resolve student complaints
- 💬 **Multi-channel Chat**: Respond to multiple student inquiries simultaneously
- 📈 **Dashboard Analytics**: View complaint statistics and performance metrics
- 📊 **Activity Monitoring**: Track all user activities for audit purposes

### Security & Session Management

- 🔐 **Secure Authentication**: JWT-based authentication with HTTP-only cookies
- ⏱️ **Automatic Session Timeout**: 15-minute idle timeout with warning notifications
- 🛡️ **XSS Prevention**: Input sanitization and output encoding
- 🔒 **CSRF Protection**: Token-based CSRF prevention via Supabase Auth
- 💉 **SQL Injection Prevention**: Parameterized queries and Row Level Security (RLS)
- 🌐 **IP Address Tracking**: Automatic capture of client IP for security auditing
- 📝 **Activity Logging**: Comprehensive audit trail of all user actions
- 🔑 **Protected Routes**: Role-based access control for sensitive pages

## 🛠 Tech Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui component library
- **Routing**: React Router v6
- **State Management**: React Hooks + Context API
- **Form Handling**: React Hook Form with Zod validation

### Backend

- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (JWT + OAuth)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for file uploads
- **API**: RESTful API via Supabase client

### Security

- **Input Validation**: Zod schema validation
- **Sanitization**: Custom sanitization library
- **Session Management**: Hybrid session tracking system
- **Encryption**: HTTPS with TLS 1.3
- **Password Hashing**: bcrypt (via Supabase Auth)

## 🔒 Security Features

### 1. Input Validation & Sanitization

```typescript
// lib/validation.ts - Schema-based validation
// lib/sanitize.ts - XSS prevention through input sanitization
```

**Prevents:**

- Cross-Site Scripting (XSS) attacks
- HTML/Script injection
- Malicious input submission

### 2. SQL Injection Prevention

```typescript
// Uses Supabase client with parameterized queries
// Row Level Security (RLS) policies enforce data access
```

**Prevents:**

- SQL injection attacks
- Unauthorized data access
- Data manipulation

### 3. CSRF Protection

```typescript
// JWT tokens in Authorization headers
// HTTP-only cookies for refresh tokens
// SameSite cookie attribute
```

**Prevents:**

- Cross-Site Request Forgery attacks
- Unauthorized actions on behalf of users

### 4. Session Security

```typescript
// components/session/SessionTimeoutProvider.tsx
// hooks/use-idle-timeout.tsx
```

**Features:**

- Automatic logout after 15 minutes of inactivity
- Warning notification at 14 minutes
- Activity tracking for timeout calculation
- Session hijacking detection via IP tracking

### 5. Authentication Security

```typescript
// Secure password hashing (bcrypt)
// JWT access tokens (short-lived, 1 hour)
// Refresh tokens (HTTP-only cookies)
// Protected routes with authentication guards
```

### 6. Database Security

```sql
-- Row Level Security (RLS) policies
-- Automatic IP address capture
-- Audit trail logging
-- Data encryption at rest
```

## 🔄 Session Management

### Three-Layer Session Tracking

#### 1. Session IDs (Database)

```sql
-- user_sessions table: Tracks session lifecycle
-- Each login creates unique UUID session identifier
-- All activities linked to session for audit trail
```

#### 2. Cookies (Browser)

```typescript
// HTTP-only cookies (XSS-safe)
// Secure flag (HTTPS only)
// SameSite attribute (CSRF protection)
// Managed by Supabase Auth
```

#### 3. JWT Tokens (Memory)

```typescript
// Access tokens: Short-lived (1 hour)
// Refresh tokens: Long-lived (stored in HTTP-only cookies)
// Automatic token refresh before expiry
```

### Session Features

- ✅ **Unique Session IDs**: UUID for each login session
- ✅ **Activity Tracking**: Important events logged to database
- ✅ **IP Address Capture**: Automatic detection of client IP
- ✅ **Session Timeout**: Auto-logout after 15 min inactivity
- ✅ **Idle Warning**: Notification 1 minute before timeout
- ✅ **Audit Trail**: Complete history of user activities
- ✅ **Active Session Monitoring**: Real-time view of logged-in users
- ✅ **Auto Data Cleanup**: Removes old logs to prevent bloat

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### Setup Steps

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd hostelcare

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env

# 4. Update .env with your Supabase credentials

# 5. Run database migrations (via Supabase dashboard)
# Upload migration files from supabase/migrations/ folder

# 6. Start development server
npm run dev
```

## 🔐 Environment Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Example:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Getting Supabase Credentials:**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select existing
3. Go to Settings → API
4. Copy the Project URL and anon/public key

## 🚀 Running the Project

### Development Mode

```bash
npm run dev
# Runs on http://localhost:8080
```

### Build for Production

```bash
npm run build
# Creates optimized build in dist/ folder
```

### Preview Production Build

```bash
npm run preview
# Preview the production build locally
```

### Lint Code

```bash
npm run lint
# Check code quality with ESLint
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Don't forget to:**

1. Add environment variables in Vercel dashboard
2. Configure Supabase project settings
3. Test all features on production URL

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Deploy
railway up
```

**All platforms provide:**

- ✅ Automatic HTTPS/SSL certificates
- ✅ CDN distribution
- ✅ Automatic deployments from Git
- ✅ Environment variable management

## 📁 Project Structure

```
hostelcare/
├── src/
│   ├── components/
│   │   ├── session/              # Session management components
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SessionTimeoutProvider.tsx
│   │   │   ├── SessionTracker.tsx
│   │   │   ├── SessionExpiryWarning.tsx
│   │   │   └── session-tracking-middleware.ts
│   │   ├── staff/                # Staff portal components
│   │   │   ├── StaffLayout.tsx
│   │   │   ├── StaffSidebar.tsx
│   │   │   └── Channelchat.tsx
│   │   ├── student/              # Student portal components
│   │   │   ├── SubmitComplaintDialog.tsx
│   │   │   └── EditComplaintDialog.tsx
│   │   ├── shared/               # Shared components
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketDetailsDialog.tsx
│   │   │   └── EditProfileDialog.tsx
│   │   └── ui/                   # shadcn/ui components (40+)
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-auth-state.tsx
│   │   ├── use-idle-timeout.tsx
│   │   ├── use-session-activity.ts
│   │   └── use-mobile.tsx
│   ├── integrations/             # Third-party integrations
│   │   └── supabase/
│   ├── lib/                      # Utility libraries
│   │   ├── sanitize.ts           # XSS prevention
│   │   ├── validation.ts         # Input validation
│   │   └── utils.ts              # Helper functions
│   ├── pages/                    # Route pages
│   │   ├── auth/
│   │   ├── staff/
│   │   ├── student/
│   │   └── Index.tsx
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # Entry point
├── supabase/
│   ├── migrations/               # Database migrations
│   │   ├── 20251222000000_create_session_activities.sql
│   │   └── 20251222100000_optimized_session_tracking.sql
│   └── config.toml              # Supabase configuration
├── .env                         # Environment variables (not in git)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 🗄 Database Schema

### Main Tables

#### `user_sessions`

Tracks session lifecycle (login → logout)

```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- login_time (TIMESTAMPTZ)
- logout_time (TIMESTAMPTZ, nullable)
- last_activity (TIMESTAMPTZ)
- ip_address (INET)
- user_agent (TEXT)
- session_duration (INTERVAL, computed)
```

#### `session_activities`

Logs important user activities

```sql
- id (UUID, PK)
- session_id (UUID, FK → user_sessions)
- user_id (UUID, FK → auth.users)
- activity_type (TEXT)
- page_path (TEXT)
- ip_address (INET)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

#### `complaints` / `tickets`

Stores maintenance complaints

```sql
- id (UUID, PK)
- student_id (UUID, FK)
- title (TEXT)
- description (TEXT)
- status (ENUM)
- priority (ENUM)
- assigned_to (UUID, FK)
- created_at, updated_at
```

### Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Triggers**: Auto-capture IP, link activities to sessions
- **Functions**: Session cleanup, activity tracking
- **Indexes**: Optimized queries on user_id, timestamps
- **Policies**: Students can only view their own data

## 📊 Key Features Demonstrated

### Web Hosting ✅

- Production deployment on professional hosting
- HTTPS/SSL certificate
- Stable, accessible 24/7
- No downtime

### Session Management ✅

- Comprehensive session tracking (Session IDs, Cookies, JWT)
- Secure authentication with role-based access
- Automatic timeout after 15 minutes inactivity
- Real-time activity logging
- IP address tracking for security

### Security Techniques ✅

- **6+ Security Measures Implemented:**
  1. Input validation (Zod schemas)
  2. Input sanitization (XSS prevention)
  3. SQL injection prevention (parameterized queries)
  4. CSRF protection (JWT + HTTP-only cookies)
  5. Secure password hashing (bcrypt)
  6. Session security (timeout + hijacking detection)
  7. HTTPS encryption (TLS 1.3)

### Code Quality ✅

- Modular, well-organized architecture
- TypeScript for type safety
- Custom hooks for business logic
- Component composition pattern
- Clear folder structure
- Separation of concerns (UI/Logic/Data)

## 👥 Contributors

- **Jillian Yeow En Yu** - Lead Developer

## 📄 License

This project is developed for academic purposes (CMT 322 - Web Engineering).

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Vite](https://vitejs.dev/) - Build tool
- [React](https://reactjs.org/) - Frontend framework

---

**Live Demo:** [Add your deployment URL here]

**Project Report:** CMT 322 - Semester 1, 2025/2026

**Last Updated:** December 30, 2025
