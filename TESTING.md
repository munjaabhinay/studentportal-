# Student Course Management Portal - Testing Checklist

## Authentication Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1 | Navigate to /login | Login page displays with sign in form | ⏳ |
| 2 | Click "Sign up" link | Form switches to sign up mode with Full Name field | ⏳ |
| 3 | Sign up with valid email/password | Account created, profile auto-created, redirected to dashboard | ⏳ |
| 4 | Sign up with short password (<6 chars) | Error message displayed | ⏳ |
| 5 | Sign up with existing email | Error: "User already registered" | ⏳ |
| 6 | Login with valid credentials | Session established, redirected to dashboard | ⏳ |
| 7 | Login with invalid credentials | Error message displayed | ⏳ |
| 8 | Click Logout | Session cleared, redirected to login | ⏳ |
| 9 | Refresh page while logged in | Session persists, user remains logged in | ⏳ |
| 10 | Access /courses/add without login | Redirected to /login | ⏳ |

## Protected Route Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 11 | Access /dashboard without login | Redirected to /login | ⏳ |
| 12 | Access /courses without login | Redirected to /login | ⏳ |
| 13 | Access /profile without login | Redirected to /login | ⏳ |
| 14 | Access /dashboard after login | Dashboard displays with user data | ⏳ |

## Role-Based Access Control Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 15 | Student accesses /courses/add | "Access Denied" message displayed | ⏳ |
| 16 | Admin accesses /courses/add | Add Course form displayed | ⏳ |
| 17 | Student sees Add Course button | Button hidden on Dashboard and Course Listing | ⏳ |
| 18 | Student sees Delete button | Delete button hidden on course rows | ⏳ |
| 19 | Admin sees Add Course button | Button visible on Dashboard and Course Listing | ⏳ |

## Course Management Tests (Admin Only)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 20 | View course listing | Table displays all courses from database | ⏳ |
| 21 | Add new course with valid data | Course created, appears in listing, redirected to /courses | ⏳ |
| 22 | Add course with empty required fields | Validation error displayed | ⏳ |
| 23 | Search courses by name | Results filtered in real-time | ⏳ |
| 24 | Search courses by trainer name | Results filtered in real-time | ⏳ |
| 25 | Filter by duration | Results filtered by selected duration | ⏳ |
| 26 | Clear search/filter | All courses displayed again | ⏳ |
| 27 | Edit course details | Course updated, success message shown | ⏳ |
| 28 | Delete course | Confirmation dialog, course removed from listing | ⏳ |
| 29 | Cancel delete | Course remains in listing | ⏳ |

## Profile Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 30 | View own profile | Name, email, role, member since displayed | ⏳ |
| 31 | Click Sign Out from profile | Signed out, redirected to login | ⏳ |

## Database Security Tests (RLS)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 32 | Student tries to insert course via API | RLS blocks the operation | ⏳ |
| 33 | Student tries to update course via API | RLS blocks the operation | ⏳ |
| 34 | Student tries to delete course via API | RLS blocks the operation | ⏳ |
| 35 | Admin can insert/update/delete courses | Operations succeed | ⏳ |
| 36 | User cannot change their own role to admin | RLS prevents role modification | ⏳ |

## Mobile Responsiveness Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 37 | Open on mobile (<768px) | Sidebar hidden, hamburger menu available | ⏳ |
| 38 | Toggle sidebar on mobile | Sidebar slides in from left | ⏳ |
| 39 | Course table on mobile | Horizontal scroll available | ⏳ |
| 40 | Login form on mobile | Centered, fits screen width | ⏳ |

## Production Build Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 41 | `npm run build` completes | No errors, dist/ folder created | ✅ |
| 42 | `npm run preview` works | Production build serves correctly | ⏳ |

**Legend:** ✅ Passed | ⏳ Pending

---

### How to Run Tests

1. **Start development server:** `npm run dev`
2. **Open browser:** http://localhost:5173
3. **Test each item above** manually by interacting with the UI
4. **Check browser console** for any JavaScript errors
5. **Check Supabase Dashboard** > Authentication > Users to verify accounts
6. **Check Supabase Dashboard** > Table Editor to verify data

---

### Testing After Supabase Connection

Before testing, ensure:
- [ ] Supabase project created at https://supabase.com
- [ ] Schema.sql executed in Supabase SQL Editor
- [ ] .env file configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- [ ] Development server restarted after .env changes