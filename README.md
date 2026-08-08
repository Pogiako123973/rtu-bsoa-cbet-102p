# Study Hub Connect

What you want to build

Three roles:

Admin (teacher) — uploads lessons, edits schedules, manages everything

Teacher — (optional) uploads lessons for their subject

Student — only views lessons and their personal schedule

Two main modules:

Module 1: Lesson Repository

Admin uploads lesson files (PDF, PPT, video, images, docs)

Files are tagged by subject + class/section + date

Student logs in → sees lessons for their subjects only

Real-time: when admin uploads, it shows up live in student portal

Search + filter by subject, date, week

Module 2: Personal Schedule (per student)

Each student has a unique schedule (different year level, section, electives)

Admin creates/edits each student's schedule

Student sees their own schedule — nobody else's

Real-time updates when admin changes it

Suggested architecture

┌─────────────────────────────────────────────┐

│             FRONTEND (Web App)               │

│   - Works on phone + PC (responsive PWA)     │

│   - Admin Panel  /  Student Portal           │

└──────────────────┬──────────────────────────┘

                   │

                   ▼

┌─────────────────────────────────────────────┐

│         BACKEND (REST API + WebSocket)       │

│   - Auth (JWT + role-based)                  │

│   - File upload (multer / S3)                │

│   - Real-time push (Socket.io / SSE)         │

└──────────────────┬──────────────────────────┘

                   │

                   ▼

┌─────────────────────────────────────────────┐

│              DATABASE                        │

│   - users (role, section, year)              │

│   - subjects                                  │

│   - lessons (file, subject, section, date)   │

│   - schedules (student_id, day, time, subj)  │

└─────────────────────────────────────────────┘

Database schema (simple version)

-- Users

users (

  id, name, email, password_hash,

role: 'admin' | 'teacher' | 'student',

  section, year_level, profile_pic

)

-- Subjects

subjects (

  id, name, code, teacher_id, section, year_level

)

-- Lessons (the file uploads)

lessons (

  id, subject_id, title, description,

  file_url, file_type, file_size,

  uploaded_by (admin id),

  created_at, is_archived

)

-- Schedule (per student)

schedules (

  id, student_id, subject_id,

  day_of_week, start_time, end_time,

  room, teacher_name

)

-- Classes/Sections (optional normalization)

sections (

  id, name, year_level, adviser_id

)

Tech stack choice (easy + fast)

Option A: Simple stack (recommended to start)

Frontend: React + Vite + Tailwind CSS (PWA — installs on phone)

Backend: Node.js + Express

DB: Supabase (PostgreSQL + auth + storage + realtime, all-in-one)

Optional: Firebase Cloud Messaging for push notifications

Option B: Pure easy mode

Frontend: Next.js

Backend: Next.js API routes (in same project)

DB: Prisma + PostgreSQL

File storage: Supabase Storage or UploadThing

I'd go with Option A — Supabase gives you auth, DB, file storage, and real-time in one, so you skip a ton of setup.

Core features checklist

Admin Panel

Login (admin role)

Upload lesson file → select subject + section → publish

Create subject (name, code, teacher, section)

Create student account (or bulk import via CSV)

Assign student to section

Build/edit schedule per student (drag-drop calendar)

View all scheduled lessons / schedule history

Dashboard: total lessons, students, active subjects

Student Portal

Login (student role)

Home: today's schedule + new lessons

Lessons tab — filtered to their subjects only

Filter by subject, date, week

Search by title

Tap to view / download file

Schedule tab — their personal weekly schedule

Day view / week view

Reminder before next class

Profile — name, section, year, subjects

Real-time updates

When admin uploads a lesson → students see it instantly (toast notification)

When admin changes schedule → student's calendar updates live

Page wireframes (text)

Admin Dashboard

┌──────────────────────────────────────────┐

│  [Logo]  Admin Panel         [Profile]   │

├──────────┬───────────────────────────────┤

│ Sidebar  │  Welcome, Admin               │

│ • Home   │  ┌─────┐ ┌─────┐ ┌─────┐      │

│ • Lessons│  │ 45  │ │230  │ │ 12  │      │

│ • Sched  │  │Lessons Students Subjects   │

│ • Users  │  └─────┘ └─────┘ └─────┘      │

│ • Subs   │                               │

│          │  Recent Uploads:              │

│          │  • Math - Quarter 1.pdf (2h)  │

│          │  • English - Poem.docx (1d)   │

└──────────┴───────────────────────────────┘

Student Portal

┌──────────────────────────────────────────┐

│  [Logo]  Student          [Profile]      │

├──────────────────────────────────────────┤

│  Hi, Juan! Today is Monday               │

│                                          │

│  Next class: Math starts in 25 min       │

│  ┌────────────────────────────────────┐  │

│  │ 08:00-09:00  Math  Room 204  Ms.Cruz│ │

│  │ 09:00-10:00  Eng  Room 201  Mr.Reyes│ │

│  └────────────────────────────────────┘  │

│                                          │

│  New Lessons:                            │

│  📘 Math - Fractions.pdf   [Download]    │

│  📘 English - Poem.docx    [Download]    │

└──────────────────────────────────────────┘

Folder structure (Next.js example)

school-lms/

├── app/

│   ├── (admin)/

│   │   ├── dashboard/

│   │   ├── lessons/upload/

│   │   ├── schedules/

│   │   └── users/

│   ├── (student)/

│   │   ├── home/

│   │   ├── lessons/

│   │   ├── schedule/

│   │   └── profile/

│   ├── login/

│   └── api/

│       ├── auth/

│       ├── lessons/

│       ├── schedules/

│       └── users/

├── components/

│   ├── ui/         (buttons, modals, etc.)

│   ├── admin/

│   └── student/

├── lib/

│   ├── supabase.ts

│   └── auth.ts

└── public/

Build plan (4-6 weeks)

Week 1 — Setup + Auth

Project setup, Supabase config

Login/signup pages with roles

Role-based routing (admin vs student)

Week 2 — Lesson uploads

Admin upload form (file + subject + section)

Storage bucket setup

Student lessons list (filtered by their subjects)

Search + filter

Week 3 — Schedule

Admin: schedule editor per student

Student: weekly schedule view

Day / week toggle

Week 4 — Real-time

Supabase realtime subscriptions

Toast notifications when new lesson arrives

Auto-refresh schedule

Week 5 — Polish

Mobile responsive check

Loading states, error handling

Empty states, illustrations

Week 6 — Optional

Push notifications

Bulk CSV import for students

File preview (PDF viewer, image galleries)

Want me to start building?

I can:

Set up the project — create the folders, install Supabase, configure auth

Build the admin upload page — the most important piece

Build the student lessons page — with filters + real-time

Build the schedule editor/viewer — for both admin and student

Write the API code — endpoints for everything

Tell me:

✅ Which tech stack you want (React + Supabase, or Next.js, or something else?)

✅ Your experience level (so I know how much to explain)

✅ Which part to start with (auth, admin upload, student view, etc.)

And I'll start coding right away. 🚀

add the to do or assignment reminder too

Perfect — adding the To-Do / Assignment Reminder module. Here's how it fits into the system:

New module: Assignments / To-Do

Two ways it can work

Option A: Admin posts assignments → students get reminded

Admin uploads assignment (title, description, file, due date, subject, section)

Students see their pending assignments auto-filtered by their subjects

Reminders before due date

Student marks as "submitted" or "done"

Admin sees who has/hasn't submitted

Option B: Student personal to-do (independent)

Student makes their own tasks

Reminders they set themselves

Recommended: Do BOTH — admin-posted assignments show up automatically in student's to-do list, and students can also add personal tasks.

Updated database schema

-- Assignments (posted by admin)

assignments (

  id, subject_id, section_id,

  title, description, file_url,

  due_date, due_time,

  max_score,                              -- optional

  created_by (admin id),

  created_at

)

-- Assignment submissions (student submits work)

submissions (

  id, assignment_id, student_id,

  file_url, submitted_at,

status: 'submitted' | 'late' | 'graded',

  grade, remarks

)

-- Personal to-do (student-created)

todos (

  id, student_id,

  title, description,

  due_date, due_time,

  priority: 'low' | 'medium' | 'high',

  is_completed: bool,

  completed_at,

  linked_assignment_id (optional, if from admin)

)

Where it shows up

Student Portal — new "Tasks" tab

┌──────────────────────────────────────────┐

│  Tasks / To-Do          [+ Add Task]    │

├──────────────────────────────────────────┤

│  Filter: [All] [Today] [This Week]      │

│         [Overdue] [Completed]            │

│                                          │

│  ⚠️ OVERDUE                              │

│  ☐ Math - Worksheet 3 (due 2 days ago)  │

│                                          │

│  📌 TODAY                                │

│  ☐ English - Read chapter 5 (due 11pm)  │

│  ☐ Science - Lab report (due 5pm)       │

│  ✓ Filipino - Essay (done)              │

│                                          │

│  📅 THIS WEEK                            │

│  ☐ Math - Quiz review (Tue)             │

│  ☐ PE - Bring shoes (Wed)               │

└──────────────────────────────────────────┘

Admin — Assignment Manager

┌──────────────────────────────────────────┐

│  Assignments              [+ New]         │

├──────────────────────────────────────────┤

│  Math - Worksheet 3                      │

│  Due: Aug 10  |  Submitted: 18/30       │

│  ████████░░  60%                         │

│  [View Submissions]                      │

│                                          │

│  English - Essay                         │

│  Due: Aug 12  |  Submitted: 5/30        │

│  ██░░░░░░░░  17%                         │

└──────────────────────────────────────────┘

Reminder system

In-app (real-time):

Toast notification when admin posts a new assignment

Toast: "⏰ Math assignment due in 1 hour"

Badge count on the Tasks tab

Push notifications (browser/mobile):

24h before due date

1h before due date

When overdue (red badge)

Calendar view (bonus):

See all assignments on a calendar with color-coded subjects

Click date → see all tasks for that day

Updated features checklist

Admin

Post assignment (title, due date, file, subject, section)

View submissions per assignment

Grade / add remarks

See submission stats (who's missing)

Student

View tasks (auto + personal)

Add personal to-do

Mark complete

Submit file for admin assignment

See grade + remarks

Filter: today / week / overdue / subject

Reminders (in-app + push)

Calendar view

Updated build plan (now 6-8 weeks)

Week 1-2: Setup + Auth + Roles (same as before)

Week 3: Lesson uploads (admin + student view)

Week 4: Schedule (admin editor + student view)

Week 5: Assignments / To-Do

Admin: post assignment

Student: view, add personal, mark done

Real-time updates

Week 6: Submissions + Grading

Student submits file

Admin views + grades

Student sees grade

Week 7: Reminders + Notifications

In-app toasts

Browser push notifications

Calendar view

Week 8: Polish + PWA + Testing

Updated home screen (student)

┌──────────────────────────────────────────┐

│ Hi, Juan! 👋  Monday, Aug 11             │

├──────────────────────────────────────────┤

│  📚 Next class: Math in 25 min           │

│                                          │

│  ⏰ Due today:                           │

│  • English - Read chapter 5             │

│  • Science - Lab report                  │

│                                          │

│  📖 New lessons:                         │

│  • Math - Fractions.pdf                  │

│                                          │

│  ┌────┐ ┌────┐ ┌────┐ ┌────┐             │

│  │Home│ │Task│ │Less│ │Cal │             │

│  └────┘ └────┘ └────┘ └────┘             │

└──────────────────────────────────────────┘

My recommended tech stack

Frontend: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui

Mobile responsive by default

PWA support (install on phone)

Fast development

Backend: Next.js API routes + Supabase

Auth (with role-based access)

PostgreSQL database

File storage (lessons, submissions)

Real-time subscriptions (perfect for this!)

Row-level security — students only see their own schedule/tasks

Notifications: Web Push API + Supabase functions

No need for Firebase

Works on phone + PC

Deployment: Vercel (free) + Supabase (free tier)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/349bcfba-c2f4-4414-92d0-b453b073d35d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
