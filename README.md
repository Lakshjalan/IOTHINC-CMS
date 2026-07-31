# Vanguard-CMS 🚀

> **Vanguard-CMS** is an all-in-one management platform designed for university clubs, developer communities, and early-stage startups to effortlessly manage members, track project progress, organize meetings, track achievements, and store assets across multi-cloud storage solutions.

---

## ✨ Features

- **👥 Member & Leadership Management**: Dynamic role-based dashboards, member directory, and profile tracking.
- **🚀 Project & Progress Tracker**: Kanban-style project tracking, milestones, and task allocations.
- **📅 Scheduler & Meetings Platform**: Intelligent meeting organizer with platform integration, agenda logs, and summary management.
- **🏆 Competitions & Contributions**: Track hackathons, achievements, member contributions, and leaderboard rankings.
- **💬 Real-Time Discussion & Chat**: Dedicated space for team announcements, real-time collaboration, and updates.
- **☁️ Multi-Cloud Hybrid Storage**: Built-in architecture supporting Supabase Storage, AWS S3, and UploadThing for assets, documents, and media uploads.
- **🛡️ Secure Access Control**: Powered by Supabase Authentication with granular Row Level Security (RLS) policies.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Phosphor Icons, Framer Motion
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS Policies, Storage)
- **Multi-Cloud Storage Engine**: AWS S3 SDK, UploadThing, Supabase Storage
- **Deployment**: Vercel / Netlify ready

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/NexusHub.git
   cd NexusHub
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and configure your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Optional Hybrid Storage Configurations
   VITE_AWS_S3_BUCKET=your-s3-bucket
   VITE_AWS_REGION=your-aws-region
   ```

4. **Database Setup**
   Execute the migration SQL scripts inside the `supabase/` and root SQL files in your Supabase SQL Editor to configure tables, functions, and RLS policies.

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📜 Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm run build` - Builds the application for production.
- `npm run preview` - Locally previews the production build.
- `npm run lint` - Runs ESLint code quality checks.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
