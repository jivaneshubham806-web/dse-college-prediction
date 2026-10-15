import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PredictionResult } from '../types/index.ts';
import { getCollegeLocation } from '../data/masterCollegeLocations.ts';

export interface GenerateCapRoundOptionListPdfParams {
  predictions: PredictionResult[];
  studentName?: string;
  percentage: number;
  category: string;
  selectedBranches: string[];
  selectedCities: string[];
}

/**
 * PDF 3: CAP ROUND OPTION LIST (Button: "⬇ CAP Round Option List (PDF)")
 * Header: Maharashtra DSE College Finder
 * Combines all colleges from all selected cities into one single ranked list.
 * Filter: selected branches, category, selected cities, and latest cutoff <= P + 6.
 * Sort: highest to lowest by latest cutoff, breaking ties by college name.
 * Columns: Preference | College Code | College Name | City | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student %
 * Preference: Numbered 1, 2, 3... in sorted order (highest cutoff is Preference 1).
 * Filename: cap_round_option_list_<P>_percent.pdf
 */
export function generateCapRoundOptionListPdf(
  params: GenerateCapRoundOptionListPdfParams
): { success: boolean; message?: string } {
  const { predictions, studentName, percentage: P, category, selectedBranches, selectedCities } = params;

  if (!selectedBranches || selectedBranches.length === 0) {
    return {
      success: false,
      message: 'Please select at least one branch.',
    };
  }

  // Filter to realistic colleges (cutoff <= P + 6)
  const eligibleColleges = predictions.filter(
    (p) => p.latestCutoff !== null && !isNaN(p.latestCutoff) && p.latestCutoff <= P + 6
  );

  if (eligibleColleges.length === 0) {
    return {
      success: false,
      message: 'No colleges found for the selected branches, cities, and cutoff range.',
    };
  }

  // Sort the entire list by latest cutoff, highest to lowest. Break ties by college name.
  eligibleColleges.sort((a, b) => {
    const aCutoff = a.latestCutoff ?? 0;
    const bCutoff = b.latestCutoff ?? 0;
    if (bCutoff !== aCutoff) {
      return bCutoff - aCutoff;
    }
    return a.collegeName.localeCompare(b.collegeName);
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 32;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 43, 73);
  doc.text('Maharashtra DSE College Finder', pageWidth / 2, currentY, { align: 'center' });
  currentY += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('CAP Round Option List (All Realistic Options — Cutoff ≤ P + 6%)', pageWidth / 2, currentY, {
    align: 'center',
  });
  currentY += 20;

  // Header Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 60, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = 48;
  const col2X = 220;
  const col3X = 420;
  const col4X = 620;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', col1X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(studentName && studentName.trim() ? studentName.trim() : '—', col1X, currentY + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Percentage (P):', col2X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`${P}% (Filter: Cutoff ≤ ${(P + 6).toFixed(2)}%)`, col2X, currentY + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Category:', col3X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(category, col3X, currentY + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Generation Date:', col4X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  const genDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(genDate, col4X, currentY + 28);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Selected Branches:', col1X, currentY + 42);
  doc.setFont('helvetica', 'normal');
  const branchesStr = selectedBranches.join(', ');
  const branchesDisplay = branchesStr.length > 36 ? branchesStr.slice(0, 34) + '...' : branchesStr;
  doc.text(branchesDisplay, col1X, currentY + 53);

  doc.setFont('helvetica', 'bold');
  doc.text('Selected Cities:', col2X, currentY + 42);
  doc.setFont('helvetica', 'normal');
  const citiesStr = selectedCities && selectedCities.length > 0 ? selectedCities.join(', ') : 'All Cities';
  const citiesDisplay = citiesStr.length > 34 ? citiesStr.slice(0, 32) + '...' : citiesStr;
  doc.text(citiesDisplay, col2X, currentY + 53);

  currentY += 76;

  const fmt = (v: number | null | undefined) =>
    v !== null && v !== undefined && !isNaN(v) ? `${v.toFixed(2)}%` : '—';

  // Subheader with total options count
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Ranked Option List (${eligibleColleges.length} Total College Option${eligibleColleges.length !== 1 ? 's' : ''})`, 36, currentY);
  currentY += 10;

  // Columns in exact order:
  // Preference | College Code | College Name | City | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student %
  const tableData = eligibleColleges.map((row, idx) => {
    const loc = getCollegeLocation(row.collegeCode);
    const city = loc ? loc.city : (row.city || '—');
    const district = loc ? loc.district : (row.district || '—');

    return [
      String(idx + 1),
      row.collegeCode,
      row.collegeName,
      city,
      district,
      row.department,
      fmt(row.cap1),
      fmt(row.cap2),
      fmt(row.cap3),
      fmt(row.latestCutoff),
      row.status,
      `${P}%`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 36, right: 36 },
    head: [
      [
        'Preference',
        'College Code',
        'College Name',
        'City',
        'District',
        'Branch',
        'CAP 1',
        'CAP 2',
        'CAP 3',
        'Latest Cutoff',
        'Chance',
        'Student %',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 46, halign: 'center' },
      1: { cellWidth: 46, halign: 'center' },
      2: { cellWidth: 140, halign: 'left' },
      3: { cellWidth: 65, halign: 'left' },
      4: { cellWidth: 60, halign: 'left' },
      5: { cellWidth: 110, halign: 'left' },
      6: { cellWidth: 40, halign: 'right' },
      7: { cellWidth: 40, halign: 'right' },
      8: { cellWidth: 40, halign: 'right' },
      9: { cellWidth: 50, halign: 'right' },
      10: { cellWidth: 65, halign: 'center' },
      11: { cellWidth: 40, halign: 'center' },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} — Maharashtra DSE College Finder`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY;
  currentY = finalY + 16;

  // Chance Description note & Disclaimer box at the end
  if (currentY > pageHeight - 150) {
    doc.addPage();
    currentY = 40;
  }

  // Chance Description Note Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 54, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('CHANCE CATEGORY DEFINITIONS (P = Student %):', 48, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Good Chance: cutoff is between P − 4 and P (under P).', 48, currentY + 27);
  doc.text('• Moderate Chance: cutoff is between P and P + 2.', 48, currentY + 38);
  doc.text('• Borderline: cutoff is between P + 2 and P + 6 (above P + 2).', 48, currentY + 49);
  doc.text('Colleges with cutoff below P − 4 or above P + 6 are not shown.', 400, currentY + 27);

  currentY += 64;

  if (currentY > pageHeight - 90) {
    doc.addPage();
    currentY = 40;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 65, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('IMPORTANT DISCLAIMER', 48, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const disclaimerText =
    'Cutoffs and estimates are indicative based on previous year CAP rounds. Actual cutoffs may vary in the current academic year according to merit rankings, seat matrix updates, and applicant preferences. Please consult official DTE Maharashtra / State CET Cell notifications for final admission decisions.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 96);
  doc.text(splitDisclaimer, 48, currentY + 34);

  // Filename: cap_round_option_list_<P>_percent.pdf
  const filename = `cap_round_option_list_${P}_percent.pdf`;
  doc.save(filename);

  return { success: true };
}
