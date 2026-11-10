import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleDashed,
  Clock3,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export type JobStatusKey =
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'issue'
  | 'cancelled';

export type AppCleaningStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

const STATUS_META: Record<
  JobStatusKey,
  {
    label: string;
    icon: LucideIcon;
    badgeClass: string;
    borderClass: string;
    tintClass: string;
  }
> = {
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    badgeClass: 'bg-status-scheduled text-status-scheduled-fg',
    borderClass: 'border-l-status-scheduled-fg',
    tintClass: 'bg-status-scheduled/80',
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    badgeClass: 'bg-status-assigned text-status-assigned-fg',
    borderClass: 'border-l-status-assigned-fg',
    tintClass: 'bg-status-assigned/80',
  },
  in_progress: {
    label: 'In progress',
    icon: Clock3,
    badgeClass: 'bg-status-progress text-status-progress-fg',
    borderClass: 'border-l-status-progress-fg',
    tintClass: 'bg-status-progress/80',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    badgeClass: 'bg-status-completed text-status-completed-fg',
    borderClass: 'border-l-status-completed-fg',
    tintClass: 'bg-status-completed/80',
  },
  issue: {
    label: 'Issue',
    icon: AlertTriangle,
    badgeClass: 'bg-status-issue text-status-issue-fg',
    borderClass: 'border-l-status-issue-fg',
    tintClass: 'bg-status-issue/80',
  },
  cancelled: {
    label: 'Cancelled',
    icon: CircleDashed,
    badgeClass: 'bg-status-cancelled text-status-cancelled-fg',
    borderClass: 'border-l-status-cancelled-fg',
    tintClass: 'bg-status-cancelled/80',
  },
};

export function mapCleaningStatus(
  status: AppCleaningStatus,
  opts?: { hasAssignee?: boolean; hasIssue?: boolean }
): JobStatusKey {
  if (opts?.hasIssue) return 'issue';
  if (status === 'skipped') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  if (opts?.hasAssignee) return 'assigned';
  return 'scheduled';
}

export function getStatusMeta(status: JobStatusKey) {
  return STATUS_META[status];
}
