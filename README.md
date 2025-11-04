# HostelCare - Hostel Maintenance System

## Project info

A digital hostel maintenance reporting system with 24/7 complaint submission, real-time tracking, and transparent resolution process.

## How to run this project

**Use your preferred IDE**

Clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create a .env file in the root directory with your Supabase credentials.
# Copy and paste the following content into the .env file:
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="zuificprggifetqknxcz"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aWZpY3ByZ2dpZmV0cWtueGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODE4NzQsImV4cCI6MjA3Nzc1Nzg3NH0.-G3QvxrqVQqUtFxa4shE0F-MLpOLBTkO2zY3WPMpbjA"
VITE_SUPABASE_URL="https://zuificprggifetqknxcz.supabase.co"
EOF

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

You can deploy this project to any hosting platform that supports React applications (e.g., Vercel, Netlify, etc.).
