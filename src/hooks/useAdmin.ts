'use client';

import { useAuth } from './useAuth';

// Admin email addresses - centralized location for admin access control
const ADMIN_EMAILS = [
  'admin@rightstayafrica.com',
  'richard@rightstayafrica.com',
  // Add more admin emails as needed
];

/**
 * Hook to check if the current user has admin privileges
 * @returns {boolean} true if user is admin, false otherwise
 */
export function useAdmin() {
  const { user } = useAuth();
  
  const isAdmin = (userEmail?: string) => {
    return userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());
  };

  return {
    isAdmin: isAdmin(user?.email),
    adminEmails: ADMIN_EMAILS,
    checkAdmin: isAdmin,
  };
}
