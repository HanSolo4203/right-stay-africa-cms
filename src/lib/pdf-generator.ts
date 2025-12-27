import jsPDF from 'jspdf';
import { Invoice } from './types';

export interface OwnerStatementData {
  propertyName: string;
  ownerName: string;
  ownerEmail: string;
  statementDate: string;
  bookings: Array<{
    booking_reference: string;
    guest_name: string;
    channel_name: string;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    accommodation_total: number;
    channel_commission: number;
    payment_processing_fee: number;
    commission_tax: number;
    net_revenue: number;
    booking_status: string;
  }>;
  totals: {
    gross_revenue: number;
    net_revenue: number;
    total_commission: number;
    total_processing_fee: number;
    total_commission_tax: number;
    booking_count: number;
  };
  expenses: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totalExpenses: number;
  rightStayCommission: number;
  rightStayCommissionRate: number;
  finalOwnerPayout: number;
}

export async function generateOwnerStatementPDF(data: OwnerStatementData): Promise<void> {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;
  
  // Modern color scheme
  const colors = {
    primary: [41, 128, 185],      // Blue
    secondary: [52, 73, 94],      // Dark gray
    accent: [46, 204, 113],       // Green
    danger: [231, 76, 60],        // Red
    light: [236, 240, 241],       // Light gray
    dark: [44, 62, 80]            // Dark blue
  };
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  // Helper function to add a modern line
  const addLine = (y: number, color: number[] = colors.light, thickness: number = 0.5) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(thickness);
    pdf.line(margin, y, pageWidth - margin, y);
    return y + 2;
  };

  // Helper function to add a modern section header
  const addSectionHeader = (title: string, y: number) => {
    // Check if we need a new page before adding header
    if (y > pageHeight - 30) {
      pdf.addPage();
      y = margin;
    }
    
    // Background rectangle
    pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
    pdf.rect(margin, y - 1, contentWidth, 8, 'F');
    
    // Header text
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    pdf.text(title, margin + 3, y + 4);
    return y + 10;
  };

  // Helper function to add logo
  const addLogo = async (y: number) => {
    try {
      // Try to load the logo from the public folder
      const logoUrl = '/logo.png';
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<number>((resolve) => {
        img.onload = () => {
          // Add logo (30mm wide, auto height) - smaller for landscape
          const logoWidth = 30;
          const logoHeight = (img.height * logoWidth) / img.width;
          pdf.addImage(img, 'PNG', pageWidth - margin - logoWidth, y, logoWidth, logoHeight);
          resolve(y);
        };
        img.onerror = () => {
          // Fallback: Add text logo if image fails
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.text('Right Stay Africa', pageWidth - margin - 50, y + 5);
          resolve(y);
        };
        img.src = logoUrl;
      });
    } catch {
      // Fallback: Add text logo
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text('Right Stay Africa', pageWidth - margin - 50, y + 5);
      return y;
    }
  };
  
  // Modern Header Section with Logo (compact for landscape)
  // Add logo to top right
  await addLogo(yPosition);
  
  // Main title with modern styling (smaller for landscape)
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.text('OWNER STATEMENT', margin, yPosition + 5);
  
  // Property info next to title
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.text(`${data.propertyName} • ${data.ownerName}`, margin, yPosition + 12);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text(`Statement Period: ${formatDate(data.statementDate)} | ${data.ownerEmail}`, margin, yPosition + 17);
  
  yPosition += 22;
  yPosition = addLine(yPosition, colors.primary, 1);
  
  // Quick Summary Cards at the top (4 cards in landscape)
  const totalNights = data.bookings.reduce((sum, booking) => sum + booking.nights, 0);
  const totalBookings = data.bookings.length;
  
  // Create summary cards
  const cardWidth = (contentWidth - 15) / 4; // 4 cards with spacing
  const cardHeight = 18;
  
  // Card 1: Total Bookings
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(margin, yPosition, cardWidth, cardHeight, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Total Bookings', margin + 3, yPosition + 5);
  pdf.setFontSize(14);
  pdf.text(totalBookings.toString(), margin + 3, yPosition + 13);
  
  // Card 2: Total Nights
  pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.rect(margin + cardWidth + 5, yPosition, cardWidth, cardHeight, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Total Nights', margin + cardWidth + 8, yPosition + 5);
  pdf.setFontSize(14);
  pdf.text(totalNights.toString(), margin + cardWidth + 8, yPosition + 13);
  
  // Card 3: Net Revenue
  pdf.setFillColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.rect(margin + (cardWidth + 5) * 2, yPosition, cardWidth, cardHeight, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Net Revenue', margin + (cardWidth + 5) * 2 + 3, yPosition + 5);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(data.totals.net_revenue), margin + (cardWidth + 5) * 2 + 3, yPosition + 13);
  
  // Card 4: Final Owner Payout (HIGHLIGHTED)
  pdf.setFillColor(46, 204, 113); // Bright green
  pdf.rect(margin + (cardWidth + 5) * 3, yPosition, cardWidth, cardHeight, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('FINAL OWNER PAYOUT', margin + (cardWidth + 5) * 3 + 3, yPosition + 5);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(data.finalOwnerPayout), margin + (cardWidth + 5) * 3 + 3, yPosition + 13);
  
  yPosition += cardHeight + 5;
  
  // Two-column layout for landscape
  const leftColX = margin;
  const rightColX = margin + (contentWidth / 2) + 5;
  const colWidth = (contentWidth / 2) - 5;
  
  // Left Column - Revenue Breakdown
  let leftY = yPosition;
  pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
  pdf.rect(leftColX, leftY - 1, colWidth, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.text('REVENUE BREAKDOWN', leftColX + 3, leftY + 4);
  leftY += 10;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Gross Revenue:', leftColX, leftY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.text(formatCurrency(data.totals.gross_revenue), leftColX + 55, leftY);
  leftY += 4;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Channel Commission:', leftColX, leftY);
  pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  pdf.text(`-${formatCurrency(data.totals.total_commission)}`, leftColX + 55, leftY);
  leftY += 4;
  
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Processing Fees:', leftColX, leftY);
  pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  pdf.text(`-${formatCurrency(data.totals.total_processing_fee)}`, leftColX + 55, leftY);
  leftY += 4;
  
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Commission Tax:', leftColX, leftY);
  pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  pdf.text(`-${formatCurrency(data.totals.total_commission_tax)}`, leftColX + 55, leftY);
  leftY += 4;
  
  leftY += 2;
  pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.setLineWidth(0.5);
  pdf.line(leftColX, leftY, leftColX + colWidth, leftY);
  leftY += 4;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.text('Net Revenue:', leftColX, leftY);
  pdf.text(formatCurrency(data.totals.net_revenue), leftColX + 55, leftY);
  leftY += 6;
  
  // Right Column - Payout Calculation
  let rightY = yPosition;
  pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
  pdf.rect(rightColX, rightY - 1, colWidth, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.text('PAYOUT CALCULATION', rightColX + 3, rightY + 4);
  rightY += 10;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Net Revenue:', rightColX, rightY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.text(formatCurrency(data.totals.net_revenue), rightColX + 55, rightY);
  rightY += 4;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text(`RightStay Fee (${data.rightStayCommissionRate}%):`, rightColX, rightY);
  pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  pdf.text(`-${formatCurrency(data.rightStayCommission)}`, rightColX + 55, rightY);
  rightY += 4;
  
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Additional Expenses:', rightColX, rightY);
  pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  pdf.text(`-${formatCurrency(data.totalExpenses)}`, rightColX + 55, rightY);
  rightY += 4;
  
  rightY += 2;
  pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.setLineWidth(1);
  pdf.line(rightColX, rightY, rightColX + colWidth, rightY);
  rightY += 4;
  
  // FINAL PAYOUT - Highlighted
  pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.rect(rightColX, rightY - 2, colWidth, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('FINAL OWNER PAYOUT:', rightColX + 3, rightY + 3);
  pdf.setFontSize(12);
  pdf.text(formatCurrency(data.finalOwnerPayout), rightColX + 55, rightY + 3);
  rightY += 10;
  
  // Move yPosition to the lower of the two columns
  yPosition = Math.max(leftY, rightY) + 5;
  
  // Expenses Section (if any)
  if (data.expenses.length > 0) {
    yPosition = addSectionHeader('ADDITIONAL EXPENSES', yPosition);
    
    data.expenses.forEach(expense => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      pdf.text(`${expense.name}:`, margin, yPosition);
      pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      pdf.text(`${expense.quantity} × ${formatCurrency(expense.price)} = ${formatCurrency(expense.total)}`, margin + 60, yPosition);
      yPosition += 4;
    });
    yPosition += 5;
  }
  
  // Modern Bookings Table (wider for landscape)
  yPosition = addSectionHeader('BOOKING DETAILS', yPosition);
  
  // Table headers with modern styling - more columns for landscape
  const colWidths = [28, 42, 26, 24, 24, 15, 26, 28, 24];
  const headers = ['Reference', 'Guest Name', 'Channel', 'Check-in', 'Check-out', 'Nights', 'Gross', 'Commission', 'Net Revenue'];
  
  // Header background
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(margin, yPosition - 1, contentWidth, 5, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255); // White text on blue background
  let xPosition = margin + 2;
  headers.forEach((header, index) => {
    pdf.text(header, xPosition, yPosition + 2);
    xPosition += colWidths[index];
  });
  
  yPosition += 6;
  
  // Table rows with alternating colors and proper page breaks
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  data.bookings.forEach((booking, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 25) {
      pdf.addPage();
      yPosition = margin;
      
      // Re-add table headers on new page
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.rect(margin, yPosition - 1, contentWidth, 5, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      xPosition = margin + 2;
      headers.forEach((header, headerIndex) => {
        pdf.text(header, xPosition, yPosition + 2);
        xPosition += colWidths[headerIndex];
      });
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
    }
    
    // Alternating row colors
    if (index % 2 === 0) {
      pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      pdf.rect(margin, yPosition - 0.5, contentWidth, 4, 'F');
    }
    
    xPosition = margin + 2;
    const rowData = [
      booking.booking_reference.substring(0, 12),
      booking.guest_name.substring(0, 20),
      booking.channel_name.substring(0, 12),
      formatDate(booking.check_in_date),
      formatDate(booking.check_out_date),
      booking.nights.toString(),
      formatCurrency(booking.accommodation_total),
      formatCurrency(booking.channel_commission),
      formatCurrency(booking.net_revenue)
    ];
    
    rowData.forEach((cell, cellIndex) => {
      if (cellIndex === rowData.length - 1) { // Last column (Net Revenue)
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      }
      pdf.text(cell, xPosition, yPosition + 2.5);
      xPosition += colWidths[cellIndex];
    });
    
    yPosition += 4;
  });
  
  // Add page numbers to all pages
  const pageCount = pdf.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    // Footer line
    const footerY = pageHeight - 10;
    pdf.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    
    // Footer content
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    pdf.text('Generated by Right Stay Africa CMS', margin, footerY);
    
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-ZA')}`, pageWidth / 2 - 20, footerY);
    
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, footerY);
  }
  
  // Open PDF in a new tab using a Blob URL (more reliable across browsers)
  const fileName = `Owner_Statement_${data.propertyName}_${data.statementDate.replace(/-/g, '_')}.pdf`;
  try {
    const blobUrl = pdf.output('bloburl');
    const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Popup blocked fallback: trigger download instead
      pdf.save(fileName);
    }
  } catch {
    // Fallback in case bloburl/open fails
    pdf.save(fileName);
  }
}

export async function generateAllOwnerStatementsPDF(propertiesData: OwnerStatementData[]): Promise<void> {
  // For now, generate individual PDFs for each property
  // In the future, this could be combined into a single multi-page PDF
  for (const propertyData of propertiesData) {
    await generateOwnerStatementPDF(propertyData);
    // Small delay between downloads to prevent browser blocking
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;
  
  // Modern color scheme - Green theme matching company logo and invoice page
  const colors = {
    primary: [34, 197, 94],        // Green (from logo/company colors)
    secondary: [52, 73, 94],      // Dark gray
    accent: [46, 204, 113],       // Light green
    danger: [231, 76, 60],        // Red
    light: [236, 240, 241],       // Light gray
    dark: [22, 163, 74]           // Dark green
  };
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  // Helper function to add logo
  const addLogo = async (y: number): Promise<number> => {
    try {
      // Fetch logo and convert to base64 for jsPDF
      const response = await fetch('/logo.png');
      if (!response.ok) throw new Error('Logo not found');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise<number>((resolve) => {
        reader.onload = () => {
          try {
            const base64 = reader.result as string;
            const img = new Image();
            img.onload = () => {
              // Calculate logo size to fit nicely (max 50mm width - 2x the previous size)
              const maxWidth = 50;
              const logoWidth = Math.min(maxWidth, (img.width * maxWidth) / img.width);
              const logoHeight = (img.height * logoWidth) / img.width;
              
              // Add logo to top left
              pdf.addImage(base64, 'PNG', margin, y, logoWidth, logoHeight);
              resolve(y);
            };
            img.onerror = () => {
              // Fallback: Add text logo if image fails
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
              pdf.text('Right Stay Africa', margin, y + 5);
              resolve(y);
            };
            img.src = base64;
          } catch {
            // Fallback
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            pdf.text('Right Stay Africa', margin, y + 5);
            resolve(y);
          }
        };
        reader.onerror = () => {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.text('Right Stay Africa', margin, y + 5);
          resolve(y);
        };
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fallback: Add text logo
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text('Right Stay Africa', margin, y + 5);
      return y;
    }
  };

  // Header Section - Logo above company name on left
  const logoY = yPosition;
  await addLogo(logoY);
  
  // Company info on left, below logo
  const logoHeight = 24; // Approximate logo height (doubled to account for 2x larger logo)
  const companyY = logoY + logoHeight + 3;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Right Stay (PTY) LTD', margin, companyY);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('RIGHT STAY AFRICA', margin, companyY + 4);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Cape Town Western Cape 8000', margin, companyY + 8);
  pdf.text('South Africa', margin, companyY + 12);
  pdf.text('rightstayza@gmail.com', margin, companyY + 16);
  
  // Right side: Invoice title and details box
  // Align right edge of box with right edge of green bar (pageWidth - margin)
  const rightSideWidth = 55;
  const rightSideX = pageWidth - margin - rightSideWidth;
  
  // Invoice title on right - show fully in black
  // Calculate text width to ensure it doesn't get cut off
  const invoiceTitle = invoice.invoice_title || 'INVOICE';
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  const titleText = invoiceTitle.toUpperCase();
  const titleWidth = pdf.getTextWidth(titleText);
  // Position title so it ends at pageWidth - margin (right edge)
  const titleX = pageWidth - margin - titleWidth;
  pdf.text(titleText, titleX, companyY);
  
  // Details box below title - properly aligned
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  const detailsBoxY = companyY + 6;
  const detailsBoxHeight = 18;
  pdf.roundedRect(rightSideX, detailsBoxY, rightSideWidth, detailsBoxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text(`Invoice #: ${invoice.invoice_number}`, rightSideX + 2, detailsBoxY + 4);
  pdf.text(`Date: ${formatDate(invoice.invoice_date)}`, rightSideX + 2, detailsBoxY + 8);
  pdf.text(`Due Date: ${formatDate(invoice.due_date)}`, rightSideX + 2, detailsBoxY + 12);
  pdf.text(`Terms: ${invoice.terms || 'Due on Receipt'}`, rightSideX + 2, detailsBoxY + 16);
  
  // Calculate yPosition based on the tallest element (left side or right side)
  const leftSideHeight = companyY + 16;
  const rightSideHeight = detailsBoxY + detailsBoxHeight;
  // Remove green line and add more spacing instead
  yPosition = Math.max(leftSideHeight, rightSideHeight) + 10; // Increased gap (was 4, now 10)
  
  // Client Information
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Bill To', margin, yPosition);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  const clientFullName = invoice.client_prefix 
    ? `${invoice.client_prefix} ${invoice.client_name}`
    : invoice.client_name;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text(clientFullName, margin, yPosition + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  if (invoice.client_email) {
    pdf.text(invoice.client_email, margin, yPosition + 10);
  }
  if (invoice.client_phone) {
    pdf.text(invoice.client_phone, margin, yPosition + 14);
  }
  if (invoice.client_address) {
    pdf.text(invoice.client_address, margin, yPosition + 18);
  }
  
  // Subject
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Subject', pageWidth - margin - 60, yPosition);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  // Use subject_description if available, otherwise generate default
  const subjectText = invoice.subject_description || `${invoice.apartment?.apartment_number || 'N/A'} - Rental Invoice`;
  pdf.text(subjectText, pageWidth - margin - 60, yPosition + 6);
  
  yPosition += 22;
  // Removed green line below Bill To section
  // pdf.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
  // pdf.setLineWidth(0.5);
  // pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;
  
  // Line Items Table
  // Table headers with green background (matching invoice page)
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(margin, yPosition, contentWidth, 7, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  // Aligned column headers
  pdf.text('#', margin + 3, yPosition + 4.5);
  pdf.text('Item & Description', margin + 10, yPosition + 4.5);
  // Right-aligned columns
  const qtyX = pageWidth - margin - 50 - pdf.getTextWidth('Qty');
  const rateX = pageWidth - margin - 35 - pdf.getTextWidth('Rate');
  const amountX = pageWidth - margin - 15 - pdf.getTextWidth('Amount');
  pdf.text('Qty', qtyX, yPosition + 4.5);
  pdf.text('Rate', rateX, yPosition + 4.5);
  pdf.text('Amount', amountX, yPosition + 4.5);
  
  yPosition += 8;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  invoice.line_items.forEach((item, index) => {
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Alternating row colors
    if (index % 2 === 0) {
      pdf.setFillColor(245, 247, 250);
      pdf.rect(margin, yPosition - 1, contentWidth, 6, 'F');
    }
    
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.setFont('helvetica', 'bold');
    pdf.text((index + 1).toString(), margin + 3, yPosition + 3.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.description.substring(0, 45), margin + 10, yPosition + 3.5);
    // Right-aligned columns for numbers
    const qtyText = item.quantity.toString();
    const rateText = formatCurrency(item.rate);
    const amountText = formatCurrency(item.amount);
    pdf.text(qtyText, pageWidth - margin - 50 - pdf.getTextWidth(qtyText), yPosition + 3.5);
    pdf.text(rateText, pageWidth - margin - 35 - pdf.getTextWidth(rateText), yPosition + 3.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(amountText, pageWidth - margin - 15 - pdf.getTextWidth(amountText), yPosition + 3.5);
    
    yPosition += 6;
  });
  
  yPosition += 8;
  
  // Totals Section with box - properly aligned to the right
  const totalsBoxWidth = 70;
  const totalsX = pageWidth - margin - totalsBoxWidth;
  
  // Start box position and calculate proper padding
  const boxStartY = yPosition;
  const totalsBoxHeight = 35;
  
  // Background box (matching invoice page gray-50)
  pdf.setFillColor(249, 250, 251); // gray-50 equivalent
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(totalsX, boxStartY, totalsBoxWidth, totalsBoxHeight, 2, 2, 'FD');
  
  // Position text with padding inside the box (start 3mm from top of box)
  const textStartY = boxStartY + 4;
  yPosition = textStartY;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Sub Total', totalsX + 3, yPosition);
  const subtotalText = formatCurrency(invoice.subtotal);
  pdf.text(subtotalText, totalsX + totalsBoxWidth - 3 - pdf.getTextWidth(subtotalText), yPosition);
  yPosition += 5;
  
  // VAT - use tax_amount from database if available, otherwise calculate 15%
  const vatAmount = invoice.tax_amount && invoice.tax_amount > 0 
    ? invoice.tax_amount 
    : invoice.subtotal * 0.15;
  pdf.text('VAT (15%)', totalsX + 3, yPosition);
  const vatText = formatCurrency(vatAmount);
  pdf.text(vatText, totalsX + totalsBoxWidth - 3 - pdf.getTextWidth(vatText), yPosition);
  yPosition += 5;
  
  if (invoice.discount_amount && invoice.discount_amount > 0) {
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.text('Discount', totalsX + 3, yPosition);
    const discountText = `-${formatCurrency(invoice.discount_amount)}`;
    pdf.text(discountText, totalsX + totalsBoxWidth - 3 - pdf.getTextWidth(discountText), yPosition);
    yPosition += 5;
  }
  
  yPosition += 2;
  pdf.setDrawColor(0, 0, 0); // Black line
  pdf.setLineWidth(0.8);
  pdf.line(totalsX + 3, yPosition, totalsX + totalsBoxWidth - 3, yPosition);
  yPosition += 4;
  
  // Total - calculate correctly: subtotal + VAT - discount
  const calculatedTotal = invoice.subtotal + vatAmount - (invoice.discount_amount || 0);
  // Use database total_amount if it exists and is reasonable, otherwise use calculated
  const finalTotal = invoice.total_amount && Math.abs(invoice.total_amount - calculatedTotal) < 0.01 
    ? invoice.total_amount 
    : calculatedTotal;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Total', totalsX + 3, yPosition);
  const totalText = formatCurrency(finalTotal);
  const totalTextWidth = pdf.getTextWidth(totalText);
  pdf.text(totalText, totalsX + totalsBoxWidth - 3 - totalTextWidth, yPosition);
  
  // Underline total
  pdf.setDrawColor(0, 0, 0); // Black underline
  pdf.setLineWidth(0.5);
  pdf.line(totalsX + totalsBoxWidth - 3 - totalTextWidth, yPosition + 1, totalsX + totalsBoxWidth - 3, yPosition + 1);
  
  yPosition += 6;
  
  // Balance Due with light green background
  const balanceDue = finalTotal - (invoice.amount_paid || 0);
  pdf.setFillColor(220, 252, 231); // Light green background
  pdf.roundedRect(totalsX, yPosition - 1, totalsBoxWidth, 6, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Balance Due', totalsX + 3, yPosition + 3);
  const balanceText = formatCurrency(balanceDue);
  pdf.text(balanceText, totalsX + totalsBoxWidth - 3 - pdf.getTextWidth(balanceText), yPosition + 3);
  
  yPosition += 12;
  
  // Notes and Banking Details
  pdf.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Banking Details
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('Banking Details', margin, yPosition);
  yPosition += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0); // Black text
  
  if (invoice.bank_account) {
    pdf.text(`Beneficiary: ${invoice.bank_account.beneficiary_name}`, margin, yPosition);
    yPosition += 4;
    pdf.text(`Account Number: ${invoice.bank_account.account_number}`, margin, yPosition);
    yPosition += 4;
    pdf.text(`Branch Code: ${invoice.bank_account.branch_code}`, margin, yPosition);
    yPosition += 4;
    pdf.text(`Bank: ${invoice.bank_account.bank_name}`, margin, yPosition);
  } else {
    pdf.text('Beneficiary: Right Stay (PTY) LTD', margin, yPosition);
    yPosition += 4;
    pdf.text('Account Number: 63120936985', margin, yPosition);
    yPosition += 4;
    pdf.text('Branch Code: 250655', margin, yPosition);
    yPosition += 4;
    pdf.text('Bank: First National Bank (FNB/RMB)', margin, yPosition);
  }
  
  yPosition += 6;
  
  // Notes
  if (invoice.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.text('Notes', margin, yPosition);
    yPosition += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.text(invoice.notes, margin, yPosition);
    yPosition += 6;
  }
  
  // Thank you message
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0); // Black text
  const thankYouText = 'Thank you for your business.';
  const thankYouWidth = pdf.getTextWidth(thankYouText);
  pdf.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPosition);
  yPosition += 8;
  
  // Footer
  const footerY = pageHeight - 15;
  pdf.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  pdf.text('Generated by Right Stay Africa CMS', margin, footerY);
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-ZA')}`, pageWidth / 2 - 20, footerY);
  pdf.text(`Page 1 of 1`, pageWidth - margin - 20, footerY);
  
  // Download PDF directly
  const fileName = `Invoice_${invoice.invoice_number}_${invoice.client_name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
}
