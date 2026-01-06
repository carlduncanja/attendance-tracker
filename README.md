# AI Academy Attendance Tracking System

A modern attendance tracking system built with Next.js 15, Supabase, and an AI-powered chatbot for administrators.

## Features

- **QR Code Check-In**: Admins display a QR code that regenerates every 30 seconds for secure attendance tracking
- **Google Sign-In**: Simple authentication using Google OAuth
- **AI Chatbot**: Admins can query attendance data using natural language
- **Real-time Updates**: QR codes auto-refresh to prevent unauthorized check-ins

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **AI**: Groq API with LLaMA 3.3 70B
- **UI**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Groq API key
- Google OAuth credentials configured in Supabase

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Setup

Run the SQL migration in `migrations/001_initial_schema.sql` in your Supabase SQL editor.

### Installation

```bash
npm install
npm run dev
```

## User Roles

### Admin
- Displays the QR code for attendees to scan
- Has access to the AI chatbot for querying attendance data
- Can view all check-in records

### Attendee
- Scans the QR code to check in
- Sees a confirmation page after successful check-in

## Project Structure

```
ai-academy-attendance/
├── app/
│   ├── api/              # API routes
│   ├── checkin/          # Check-in page (from QR scan)
│   ├── login/            # Google Sign-In page
│   ├── qr-display/       # Admin QR code display
│   └── thankyou/         # Post check-in confirmation
├── components/
│   ├── assistant-ui/     # AI chatbot components
│   ├── common/           # Shared components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities and database tools
├── migrations/           # SQL migrations
└── src/                  # Store and types
```

## License

MIT

