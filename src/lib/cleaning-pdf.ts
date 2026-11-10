import jsPDF from 'jspdf';
import {
  formatMonthLabel,
  getCalendarCells,
  getMonthDateRange,
} from '@/lib/cleaning-month';
import type { CleaningTaskWithDetails } from '@/lib/queries/cleaning';
import { getPropertyDisplayName } from '@/lib/queries/cleaning';

export interface CleaningPdfTask {
  scheduled_date: string;
  task_type: 'checkout_clean' | 'midstay_clean';
  status: string;
  apartment_name: string;
  uplisting_name: string | null;
  guest_name: string | null;
  nights: number;
  cleaner_name: string | null;
  cleaner_payout: number | null;
  booking_reference: string | null;
}

function toPdfTask(task: CleaningTaskWithDetails | CleaningPdfTask): CleaningPdfTask {
  return {
    scheduled_date: task.scheduled_date,
    task_type: task.task_type,
    status: task.status,
    apartment_name: task.apartment_name,
    uplisting_name: task.uplisting_name,
    guest_name: task.guest_name,
    nights: task.nights,
    cleaner_name: task.cleaner_name,
    cleaner_payout: task.cleaner_payout,
    booking_reference: task.booking_reference,
  };
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatZAR(amount: number | null | undefined): string {
  if (amount == null) return 'No rate';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function taskTypeLabel(taskType: CleaningPdfTask['task_type']) {
  return taskType === 'checkout_clean' ? 'Checkout Clean' : 'Mid-Stay Clean';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function propertyLabel(task: CleaningPdfTask) {
  return task.apartment_name || task.uplisting_name || 'Unknown';
}

function groupByDate(tasks: CleaningPdfTask[]) {
  const groups = new Map<string, CleaningPdfTask[]>();
  for (const task of tasks) {
    const existing = groups.get(task.scheduled_date) ?? [];
    existing.push(task);
    groups.set(task.scheduled_date, existing);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

async function tryAddLogo(pdf: jsPDF, x: number, y: number, w = 28, h = 10) {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return y;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    pdf.addImage(dataUrl, 'PNG', x, y, w, h);
    return y + h + 2;
  } catch {
    return y;
  }
}

export async function generateCleaningListPDF(
  tasksInput: Array<CleaningTaskWithDetails | CleaningPdfTask>,
  monthKey: string
): Promise<void> {
  const tasks = tasksInput.map(toPdfTask);
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const colors = {
    primary: [37, 99, 235] as [number, number, number],
    dark: [17, 24, 39] as [number, number, number],
    muted: [107, 114, 128] as [number, number, number],
    light: [243, 244, 246] as [number, number, number],
    line: [229, 231, 235] as [number, number, number],
    orange: [194, 65, 12] as [number, number, number],
    amber: [146, 64, 14] as [number, number, number],
  };

  y = await tryAddLogo(pdf, margin, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...colors.dark);
  pdf.text('Cleaning Schedule', margin, y + 6);
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.muted);
  const range = getMonthDateRange(monthKey);
  pdf.text(
    `${formatMonthLabel(monthKey)}  ·  ${formatDate(range.start)} – ${formatDate(range.end)}  ·  ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
    margin,
    y
  );
  y += 8;

  const col = {
    date: margin,
    property: margin + 38,
    type: margin + 95,
    guest: margin + 128,
    nights: margin + 168,
    cleaner: margin + 182,
    payout: margin + 220,
    status: margin + 248,
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const drawTableHeader = () => {
    pdf.setFillColor(...colors.light);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.dark);
    pdf.text('Date', col.date + 1, y + 5);
    pdf.text('Property', col.property + 1, y + 5);
    pdf.text('Task type', col.type + 1, y + 5);
    pdf.text('Guest', col.guest + 1, y + 5);
    pdf.text('Nights', col.nights + 1, y + 5);
    pdf.text('Cleaner', col.cleaner + 1, y + 5);
    pdf.text('Payout', col.payout + 1, y + 5);
    pdf.text('Status', col.status + 1, y + 5);
    y += 10;
  };

  for (const [date, dayTasks] of groupByDate(tasks)) {
    ensureSpace(18);
    pdf.setFillColor(...colors.primary);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(formatDate(date), margin + 2, y + 5.5);
    pdf.text(
      `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`,
      pageWidth - margin - 2,
      y + 5.5,
      { align: 'right' }
    );
    y += 10;
    drawTableHeader();

    for (const task of dayTasks) {
      ensureSpace(12);
      pdf.setDrawColor(...colors.line);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + 8, pageWidth - margin, y + 8);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.dark);
      pdf.text(formatDate(task.scheduled_date), col.date + 1, y + 5);

      const prop = propertyLabel(task);
      pdf.text(prop.length > 28 ? `${prop.slice(0, 27)}…` : prop, col.property + 1, y + 5);

      pdf.setTextColor(...(task.task_type === 'checkout_clean' ? colors.orange : colors.amber));
      pdf.text(taskTypeLabel(task.task_type), col.type + 1, y + 5);

      pdf.setTextColor(...colors.dark);
      const guest = task.guest_name ?? '—';
      pdf.text(guest.length > 16 ? `${guest.slice(0, 15)}…` : guest, col.guest + 1, y + 5);
      pdf.text(task.nights ? String(task.nights) : '—', col.nights + 1, y + 5);

      const cleaner = task.cleaner_name ?? 'Unassigned';
      pdf.setTextColor(...(task.cleaner_name ? colors.dark : colors.orange));
      pdf.text(cleaner.length > 16 ? `${cleaner.slice(0, 15)}…` : cleaner, col.cleaner + 1, y + 5);

      pdf.setTextColor(...(task.cleaner_payout == null ? colors.orange : colors.dark));
      pdf.text(formatZAR(task.cleaner_payout), col.payout + 1, y + 5);

      pdf.setTextColor(...colors.dark);
      pdf.text(statusLabel(task.status), col.status + 1, y + 5);
      y += 9;
    }
    y += 4;
  }

  if (tasks.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...colors.muted);
    pdf.text('No cleaning tasks for this month.', margin, y + 10);
  }

  pdf.save(`cleaning-schedule-list-${monthKey}.pdf`);
}

export async function generateCleaningCalendarPDF(
  tasksInput: Array<CleaningTaskWithDetails | CleaningPdfTask>,
  monthKey: string
): Promise<void> {
  const tasks = tasksInput.map(toPdfTask);
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const colors = {
    primary: [37, 99, 235] as [number, number, number],
    dark: [17, 24, 39] as [number, number, number],
    muted: [107, 114, 128] as [number, number, number],
    light: [249, 250, 251] as [number, number, number],
    line: [209, 213, 219] as [number, number, number],
    orangeBg: [255, 237, 213] as [number, number, number],
    amberBg: [254, 243, 199] as [number, number, number],
  };

  y = await tryAddLogo(pdf, margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...colors.dark);
  pdf.text('Cleaning Schedule — Calendar', margin, y + 6);
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.muted);
  pdf.text(`${formatMonthLabel(monthKey)}  ·  ${tasks.length} task${tasks.length === 1 ? '' : 's'}`, margin, y);
  y += 8;

  const byDate = new Map<string, CleaningPdfTask[]>();
  for (const task of tasks) {
    const list = byDate.get(task.scheduled_date) ?? [];
    list.push(task);
    byDate.set(task.scheduled_date, list);
  }

  const cells = getCalendarCells(monthKey);
  const weeks = Math.ceil(cells.length / 7);
  const gridWidth = pageWidth - margin * 2;
  const colWidth = gridWidth / 7;
  const rowHeight = Math.min(32, (pageHeight - y - 20) / Math.max(weeks, 1));
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.muted);
  dayNames.forEach((name, i) => {
    pdf.text(name, margin + i * colWidth + 2, y + 4);
  });
  y += 6;

  for (let week = 0; week < weeks; week++) {
    const rowY = y + week * rowHeight;
    for (let day = 0; day < 7; day++) {
      const cell = cells[week * 7 + day];
      const x = margin + day * colWidth;
      pdf.setDrawColor(...colors.line);
      pdf.setFillColor(...colors.light);
      pdf.rect(x, rowY, colWidth, rowHeight, 'FD');

      if (!cell?.date) continue;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.dark);
      pdf.text(String(cell.dayNumber), x + 2, rowY + 5);

      const dayTasks = byDate.get(cell.date) ?? [];
      let ty = rowY + 9;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      for (const task of dayTasks.slice(0, 4)) {
        const bg = task.task_type === 'checkout_clean' ? colors.orangeBg : colors.amberBg;
        pdf.setFillColor(...bg);
        pdf.roundedRect(x + 1, ty - 3, colWidth - 2, 4.5, 0.8, 0.8, 'F');
        pdf.setTextColor(...colors.dark);
        const label = `${taskTypeLabel(task.task_type).slice(0, 3)} · ${propertyLabel(task)}`;
        pdf.text(label.length > 22 ? `${label.slice(0, 21)}…` : label, x + 2, ty);
        ty += 5.2;
        if (ty > rowY + rowHeight - 3) break;
      }
      if (dayTasks.length > 4) {
        pdf.setTextColor(...colors.muted);
        pdf.text(`+${dayTasks.length - 4} more`, x + 2, Math.min(ty, rowY + rowHeight - 2));
      }
    }
  }

  const legendY = y + weeks * rowHeight + 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setFillColor(...colors.orangeBg);
  pdf.roundedRect(margin, legendY - 3, 4, 4, 0.5, 0.5, 'F');
  pdf.setTextColor(...colors.dark);
  pdf.text('Checkout Clean', margin + 6, legendY);
  pdf.setFillColor(...colors.amberBg);
  pdf.roundedRect(margin + 45, legendY - 3, 4, 4, 0.5, 0.5, 'F');
  pdf.text('Mid-Stay Clean', margin + 51, legendY);

  pdf.save(`cleaning-schedule-calendar-${monthKey}.pdf`);
}

export function tasksForMonthPdf(
  tasks: CleaningTaskWithDetails[],
  monthKey: string
): CleaningTaskWithDetails[] {
  const { start, end } = getMonthDateRange(monthKey);
  return tasks.filter((t) => t.scheduled_date >= start && t.scheduled_date <= end);
}

export { getPropertyDisplayName };
