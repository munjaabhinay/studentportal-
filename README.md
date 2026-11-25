# Student Course Management Portal

A professional full-stack web application for managing courses, built with React, Supabase, and deployed on Vercel.

## 📋 Project Overview

The Student Course Management Portal is a centralized web application that allows administrators to authenticate, manage courses, and access a dashboard. Students can view courses and their profiles. The application uses Supabase for authentication, database, and row-level security.

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, JavaScript, CSS3 |
| Routing | React Router DOM |
| Icons | Lucide React |
| Backend | Supabase (Auth + PostgreSQL) |
| Security | Supabase Row Level Security (RLS) |
| Deployment | Vercel |
| Source Control | Git, GitHub |

## 📁 Folder Structure

```
student-course-portal/
├── database/
│   └── schema.sql              # Supabase SQL schema with RLS policies
├── supabase/
│   ├── migrations/             # Additive Supabase database migrations
│   └── promote_existing_user_to_admin.sql # One-time privileged bootstrap
├── src/
│   ├── main.jsx                # Application entry point
│   ├── App.jsx                 # Routing configuration
│   ├── index.css               # Global styles (CSS variables)
│   ├── components/             # Reusable UI components
│   ├── pages/
│   │   ├── Login.jsx           # Login / Signup page
│   │   ├── Dashboard.jsx       # Admin dashboard with stats
│   │   ├── CourseListing.jsx   # Course list with search & filter
│   │   ├── AddCourse.jsx       # Create course form (admin)
│   │   ├── EditCourse.jsx      # Edit / Delete course (admin)
│   │   ├── Profile.jsx         # User profile page
│   │   └── NotFound.jsx        # 404 page
│   ├── layouts/
│   │   └── MainLayout.jsx      # Sidebar + Navbar layout
│   ├── context/
│   │   └── AuthContext.jsx     # Authentication state management
│   ├── hooks/                  # Custom React hooks
│   ├── services/
│   │   └── supabase.js         # Supabase client configuration
│   ├── lib/                    # Utility functions
│   └── assets/                 # Static assets
├── .env                        # Supabase credentials (local only)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── TESTING.md                  # Testing checklist
### Row Level Security (RLS) Policies

**profiles table:**
- Users can view their own profile
- Users can update their own name and email, never their role
- Profiles are created by a database trigger; clients cannot insert profiles or grant roles
- Administrators can view registered profiles

**courses table:**
- Anyone can view courses (SELECT)
- Only admins can INSERT courses
- Only admins can UPDATE courses
- Only admins can DELETE courses
- Role checks use a `SECURITY DEFINER` function to avoid recursive profile RLS

### Security Features
- ✅ Service role key never exposed in frontend
- ✅ Only `anon` key used in client-side code
- ✅ Users cannot modify their own role to admin
- ✅ Default role for new users is 'student'
- ✅ Database triggers auto-create profiles on signup

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ installed (required by Vite 8)
- Supabase account (https://supabase.com)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd student-course-portal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase dashboard: **Project Settings > API**

⚠️ **Never commit `.env` or other environment-specific `.env.*` files to GitHub.** Only `.env.example` is intended to be tracked. Frontend variables are included in the built JavaScript, so use only a Supabase anon/publishable key here—never a `service_role` or secret key.

### 4. Set Up Supabase Database


## 🔐 Authentication Flow

1. User visits `/login`
2. User can sign in or sign up
3. On signup, Supabase Auth creates the user account
4. Database trigger automatically creates a `profiles` row with role 'student'
5. On login, session is established and stored in browser
6. `AuthContext` listens for auth state changes
7. Protected routes check for an active session
8. Logout clears the session and redirects to `/login`

## 🎯 Key Features

- ✅ User authentication (login/signup/logout)
- ✅ Session persistence (stays logged in on refresh)
- ✅ Protected routes (redirect to login if not authenticated)
- ✅ Role-based access control (admin vs student)
- ✅ Course CRUD (Create, Read, Update, Delete)
- ✅ Course search (by name or trainer)
- ✅ Course filtering (by duration)
- ✅ User profile management
- ✅ Responsive design (mobile-friendly)
- ✅ Loading and error states
- ✅ Production build verified

## 🧪 Testing

See [TESTING.md](./TESTING.md) for the complete testing checklist.

### Quick Test Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚢 Deployment to Vercel

1. Push code to GitHub
2. Connect GitHub repository to Vercel
3. In Vercel, open **Project Settings → Environment Variables** and add these exact names:
   - `VITE_SUPABASE_URL` — Supabase **Project URL**
   - `VITE_SUPABASE_ANON_KEY` — Supabase **anon public** key (or a Supabase publishable key)
4. Enable both variables for **Production** and **Preview**. Add them to **Development** too only if using Vercel's local development workflow.
5. Save the variables and trigger a **new deployment**. Vite embeds `VITE_` variables at build time; changing them does not update an already-built deployment.

For the Vercel-Supabase integration, the Vite config also accepts `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the public key. Explicit mappings are used; other `SUPABASE_*` variables such as database credentials are never exposed to browser code. When multiple supported names are set, `VITE_` names take precedence.

The Vercel build command is `npm run build` and the output directory is `dist` (configured in `vercel.json`). The rewrite to `/index.html` supports client-side routes. Confirm the Vercel project uses the repository root as its Root Directory.

The local `.env` and `.env.example` files supplied with this workspace contain example placeholders only. Copy `.env.example` to `.env` for local work and replace both values with those from your own Supabase project; `.env` is ignored and must never be committed.

If you already applied an earlier version of `database/schema.sql`, run this SQL once in the Supabase SQL Editor to prevent users from updating their own profile role:

```sql
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, email) ON TABLE public.profiles TO authenticated;
```

### ⚠️ Fix for "Permission Denied" Build Error on Vercel

If Vercel shows `Permission denied` on the `vite` binary during build (exit code 126), three fixes are applied in this project:

**package.json** — Build script uses `npx` plus a `postinstall` permission fix:
```json
"scripts": {
  "build": "npx vite build",
  "postinstall": "chmod +x node_modules/.bin/vite 2>/dev/null || true"
}
```

**vercel.json** — Vercel build configuration:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `postinstall` script runs after `npm install` and fixes execute permissions on the `vite` binary. The `rewrites` rule ensures refreshing on any route (e.g., `/courses/add`) serves `index.html` instead of returning 404, which is required for React Router SPA applications.

## 📱 Screenshots

- **Login Page**: Clean login/signup form with validation
- **Dashboard**: Stats cards, quick actions, recent courses
- **Course Listing**: Searchable, filterable course table
- **Add/Edit Course**: Form-based course management
- **Profile**: User information and sign out

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License

## 👨‍🏫 For Students (Learning Guide)

This project demonstrates:

1. **React Context API** for global state management (AuthContext)
2. **Custom Hooks** (`useAuth`) for reusable authentication logic
3. **React Router** for client-side routing with protected routes
4. **Supabase Client** for database operations from frontend
5. **Row Level Security** for database-level access control
6. **Controlled Components** for form handling
7. **Conditional Rendering** for role-based UI
8. **Responsive CSS** with CSS variables and media queries

Each file includes inline comments explaining its purpose and how it connects to other files.
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and paste the contents of `database/schema.sql`
4. Click **Run** to execute the schema

### Apply role security migration and create the first admin

For an existing portal, **do not rerun `database/schema.sql`**: it contains non-idempotent table/policy creation statements. Run only the migration below. On a brand-new Supabase project, create the base schema once first, then apply this migration.

1. In Supabase Dashboard, open **SQL Editor**.
2. Copy the contents of `supabase/migrations/20261125173000_secure_profile_roles_and_admin_access.sql` and run it once. It preserves existing data and policies, backfills missing profiles as students, and adds admin/profile protections.
3. In Supabase Dashboard, open **Authentication → Providers → Email** and turn **Confirm email** off. Save the setting. Supabase controls whether signup returns an authenticated session; the frontend cannot disable this project-level setting itself.
4. Open `supabase/promote_existing_user_to_admin.sql`, replace `REPLACE_WITH_CONFIRMED_EMAIL` with your confirmed account email, and run it as the authorized project/database administrator in SQL Editor. Do not expose a service-role key to the browser or paste it into application environment variables.
5. Sign out and sign back in to refresh the profile role. Admin navigation and the `/admin` dashboard will then appear.

The promotion SQL refuses unconfirmed or unknown accounts and should only be used by a trusted database administrator. Students cannot promote themselves or change their role through the application.

### Email confirmation setting

Email confirmation is intentionally disabled for this application. In Supabase Dashboard, open **Authentication → Providers → Email**, turn **Confirm email** off, and save. New signups then return an authenticated session and can enter the portal immediately. This reduces account ownership assurance and may increase fake registrations; retain strong passwords, rate limits, and database RLS.

Changing the setting does not necessarily confirm accounts that were created earlier. Check **Authentication → Users** and have an authorized Supabase administrator update an existing account's confirmation status there before it can sign in. The app does not send verification emails or bypass authentication.

If signup returns **“email rate limit exceeded”** or HTTP 429, Supabase has temporarily throttled signup/email activity; this cannot be fixed by retrying from the frontend. Wait before trying again and avoid repeated submissions. Confirm that **Confirm email** is off in the Supabase project actually used by the deployment, then check **Authentication → Rate Limits**, the configured email provider/SMTP settings, and the project's Auth logs. Do not raise limits just to mask automated or repeated signup traffic.

### 6. Run Development Server
```bash
npm run dev
```
Open http://localhost:5173

### 7. Build for Production
```bash
npm run build
npm run preview
```
└── README.md                   # This file
```

## 🗄 Database Architecture

### Tables

#### profiles
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | References auth.users.id (Primary Key) |
| full_name | TEXT | User's full name |
| email | TEXT | User's email address |
| role | TEXT | 'admin' or 'student' (default: 'student') |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### courses
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key (auto-generated) |
| course_name | TEXT | Course name (required) |
| trainer_name | TEXT | Trainer name (required) |
| duration | TEXT | Course duration (required) |
| description | TEXT | Course description (optional) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |