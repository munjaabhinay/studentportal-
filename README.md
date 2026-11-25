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
- Users can update their own profile (excluding role)
- Users can insert their own profile (auto-created on signup)

**courses table:**
- Anyone can view courses (SELECT)
- Only admins can INSERT courses
- Only admins can UPDATE courses
- Only admins can DELETE courses

### Security Features
- ✅ Service role key never exposed in frontend
- ✅ Only `anon` key used in client-side code
- ✅ Users cannot modify their own role to admin
- ✅ Default role for new users is 'student'
- ✅ Database triggers auto-create profiles on signup

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
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

⚠️ **Never commit `.env` to GitHub.** It is listed in `.gitignore`.

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
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. Verify production URL connects to Supabase

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

### 5. Create First Admin User

1. Sign up through the application at `/login`
2. In Supabase Dashboard, go to **Table Editor > profiles**
3. Find your user and change `role` from `'student'` to `'admin'`
4. Refresh the application

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