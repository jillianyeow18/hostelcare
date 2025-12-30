# 🏠 HostelCare - Hostel Complaint Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e.svg)](https://supabase.com/)

A comprehensive digital hostel complaint management system with role-based access control, real-time tracking, and enterprise-grade security features. Built for CMT 322 Web Engineering project.

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


## 🔐 Environment Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


