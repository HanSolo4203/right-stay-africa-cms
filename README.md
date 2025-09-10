
# Right Stay Africa - Cleaning Management System

A modern, responsive cleaning management system built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Comprehensive overview of cleaning operations with key metrics and recent activity
- **Calendar**: Visual scheduling and management of cleaning sessions
- **Settings**: Property and cleaner management, notifications, and system preferences
- **Responsive Design**: Mobile-first approach with modern UI/UX
- **TypeScript**: Full type safety throughout the application
- **Supabase Integration**: Ready for database integration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (configured)
- **Icons**: Lucide React
- **Charts**: Recharts (for future analytics)
- **Calendar**: React Big Calendar (for future calendar implementation)
- **Date Handling**: date-fns

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with header
│   ├── page.tsx            # Home page
│   ├── calendar/page.tsx   # Calendar view
│   ├── dashboard/page.tsx  # Dashboard with metrics
│   └── settings/page.tsx   # Settings and management
├── components/
│   ├── ui/                 # Reusable UI components
│   └── layout/
│       └── Header.tsx      # Navigation header
└── lib/
    ├── supabase.ts         # Supabase client configuration
    ├── types.ts            # TypeScript type definitions
    └── utils.ts            # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd right-stay-africa-cms
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application expects the following Supabase tables:

### Apartments
- `id` (uuid, primary key)
- `name` (text)
- `address` (text)
- `unit_number` (text, optional)
- `bedrooms` (integer)
- `bathrooms` (integer)
- `square_feet` (integer, optional)
- `status` (text: 'active', 'inactive', 'maintenance')
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Cleaners
- `id` (uuid, primary key)
- `name` (text)
- `email` (text)
- `phone` (text, optional)
- `status` (text: 'active', 'inactive', 'on_leave')
- `hourly_rate` (numeric, optional)
- `specialties` (text[], optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Cleaning Sessions
- `id` (uuid, primary key)
- `apartment_id` (uuid, foreign key)
- `cleaner_id` (uuid, foreign key)
- `scheduled_date` (date)
- `start_time` (time)
- `end_time` (time)
- `status` (text: 'scheduled', 'in_progress', 'completed', 'cancelled')
- `cleaning_type` (text: 'regular', 'deep', 'move_in', 'move_out', 'maintenance')
- `notes` (text, optional)
- `rating` (integer, optional)
- `feedback` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features Overview

### Dashboard
- Key performance metrics
- Recent cleaning sessions
- Upcoming appointments
- Revenue tracking

### Calendar
- Monthly/weekly/daily views
- Event scheduling
- Cleaner assignment
- Status tracking

### Settings
- Property management
- Cleaner profiles
- Notification preferences
- Security settings
- Theme customization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software for Right Stay Africa.

## Support

For support and questions, please contact the development team.