# Supabase Database Setup Guide

This guide will help you set up the Supabase database for the Right Stay Africa Cleaning Management System.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `right-stay-africa-cms`
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (usually takes 1-2 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

## Step 3: Update Environment Variables

1. Open your project's `.env.local` file
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 4: Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from your project root
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- `apartments` table
- `cleaners` table  
- `cleaning_sessions` table
- Indexes for better performance
- Triggers for automatic `updated_at` timestamps
- Sample data for testing
- A detailed view for cleaning sessions

## Step 5: Verify Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see three tables: `apartments`, `cleaners`, and `cleaning_sessions`
3. Check that each table has sample data
4. Go to **Database** → **Views** to see the `cleaning_sessions_detailed` view

## Step 6: Test the Application

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000)
3. Navigate to the Dashboard to see real data from your database
4. Check that the statistics are loading correctly

## Database Schema Overview

### Tables

#### `apartments`
- `id` (UUID, Primary Key)
- `apartment_number` (Text, Unique)
- `owner_name` (Text)
- `owner_email` (Text, Optional)
- `address` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `cleaners`
- `id` (UUID, Primary Key)
- `name` (Text)
- `phone` (Text, Optional)
- `email` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `cleaning_sessions`
- `id` (UUID, Primary Key)
- `apartment_id` (UUID, Foreign Key)
- `cleaner_id` (UUID, Foreign Key)
- `cleaning_date` (Date)
- `notes` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Views

#### `cleaning_sessions_detailed`
A view that joins all three tables to provide complete session information including apartment and cleaner details.

## Sample Data

The schema includes sample data:
- 5 apartments (101, 102, 201, 202, 301)
- 5 cleaners (Alice Wilson, Bob Thompson, Carol Martinez, David Lee, Eva Garcia)
- 5 cleaning sessions with various dates

## Security Considerations

For production use, consider:

1. **Row Level Security (RLS)**: Enable RLS on tables if you need user-specific data access
2. **API Keys**: Keep your service role key secure and never expose it in client-side code
3. **Database Backups**: Set up regular backups in Supabase
4. **Access Control**: Implement proper authentication and authorization

## Troubleshooting

### Common Issues

1. **Connection Error**: Verify your environment variables are correct
2. **Table Not Found**: Make sure you ran the SQL schema successfully
3. **Permission Denied**: Check that your API keys have the correct permissions

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
- Review the application logs in your browser's developer console

## Next Steps

Once your database is set up:

1. **Add Authentication**: Implement user login/signup if needed
2. **Add More Features**: Extend the schema for additional functionality
3. **Deploy**: Deploy your application to production
4. **Monitor**: Set up monitoring and logging for your database

Your Right Stay Africa Cleaning Management System is now ready to use with a fully functional database! 🚀
