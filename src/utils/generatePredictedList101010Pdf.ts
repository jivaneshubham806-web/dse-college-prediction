import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PredictionResult, ChanceCategory } from '../types/index.ts';

export interface GeneratePredictedListPdfParams {
  predictions: PredictionResult[];
  studentName?: string;
  percentage: number;
  category: string;
  selectedBranches: string[];
  selectedCities: string[];
}

/**
 * PDF 1: BEST MATCH LIST (Button: "⬇ Best Match List (PDF)")
 * Header: Maharashtra DSE College Finder
 * Existing 10:10:10 list: 10 Good Chance, 10 Moderate Chance, 10 Borderline.
 * Columns: College Code | College Name | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student %.
 * Keep the shortfall note and the analysis page.
 * Filename: best_match_list_<P>_percent.pdf
 */
export function generatePredictedList101010Pdf(
  params: GeneratePredictedListPdfParams
): { success: boolean; message?: string } {
  const { predictions, studentName, percentage: P, category, selectedBranches, selectedCities } = params;

  if (!predictions || predictions.length === 0) {
    return {
      success: false,
      message: 'No colleges found for the selected branches, cities, and cutoff range.',
    };
  }

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
  doc.text('Best Match List (10:10:10 Strategy)', pageWidth / 2, currentY, { align: 'center' });
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
  doc.text(`${P}%`, col2X, currentY + 28);

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

  // Filter 10:10:10 list
  const groupsConfig: { name: ChanceCategory; headerColor: [number, number, number] }[] = [
    { name: 'Good Chance', headerColor: [16, 185, 129] },
    { name: 'Moderate Chance', headerColor: [37, 99, 235] },
    { name: 'Borderline', headerColor: [245, 158, 11] },
  ];

  const fmt = (v: number | null) => (v !== null && !isNaN(v) ? `${v.toFixed(2)}%` : '—');

  // Keep tracking analysis metrics
  const groupStats: {
    group: string;
    count: number;
    lowest: number | null;
    highest: number | null;
    average: number | null;
  }[] = [];

  groupsConfig.forEach((cfg) => {
    const matching = predictions.filter((p) => p.status === cfg.name);
    const selected = matching.slice(0, 10);

    // Compute stats from latest cutoff
    const cutoffs = selected
      .map((s) => s.latestCutoff)
      .filter((c): c is number => c !== null && !isNaN(c));

    let lowest: number | null = null;
    let highest: number | null = null;
    let average: number | null = null;

    if (cutoffs.length > 0) {
      lowest = Math.min(...cutoffs);
      highest = Math.max(...cutoffs);
      average = cutoffs.reduce((a, b) => a + b, 0) / cutoffs.length;
    }

    groupStats.push({
      group: cfg.name,
      count: selected.length,
      lowest,
      highest,
      average,
    });

    if (currentY > pageHeight - 120) {
      doc.addPage();
      currentY = 36;
    }

    // Group Header & Shortfall note
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Group: ${cfg.name} (${selected.length} colleges)`, 36, currentY);

    if (selected.length < 10) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(194, 65, 12);
      doc.text(`* Only ${selected.length} ${cfg.name} colleges available`, 250, currentY);
    }
    currentY += 8;

    if (selected.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`No colleges available in this category for the current profile.`, 36, currentY + 12);
      currentY += 24;
      return;
    }

    // Table columns: College Code | College Name | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student %
    const tableData = selected.map((row) => [
      row.collegeCode,
      row.collegeName,
      row.district || row.city,
      row.department,
      fmt(row.cap1),
      fmt(row.cap2),
      fmt(row.cap3),
      row.latestCutoff !== null && !isNaN(row.latestCutoff) ? `${row.latestCutoff.toFixed(2)}%` : '—',
      row.status,
      `${P}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 36, right: 36 },
      head: [
        [
          'College Code',
          'College Name',
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
        fillColor: cfg.headerColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 55, halign: 'center' },
        1: { cellWidth: 160, halign: 'left' },
        2: { cellWidth: 60, halign: 'left' },
        3: { cellWidth: 110, halign: 'left' },
        4: { cellWidth: 42, halign: 'right' },
        5: { cellWidth: 42, halign: 'right' },
        6: { cellWidth: 42, halign: 'right' },
        7: { cellWidth: 55, halign: 'right' },
        8: { cellWidth: 65, halign: 'center' },
        9: { cellWidth: 45, halign: 'center' },
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

    const finalY = (doc as any).lastAutoTable?.finalY;
    currentY = (finalY || currentY) + 18;
  });

  // Final page: Latest Cutoff Summary
  doc.addPage();
  currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 43, 73);
  doc.text('Latest Cutoff Summary', pageWidth / 2, currentY, { align: 'center' });
  currentY += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Summary metrics across the selected 10:10:10 college recommendation groups:',
    36,
    currentY
  );
  currentY += 15;

  const analysisTableData = groupStats.map((s) => [
    s.group,
    `${s.count} colleges`,
    s.lowest !== null ? `${s.lowest.toFixed(2)}%` : '—',
    s.highest !== null ? `${s.highest.toFixed(2)}%` : '—',
    s.average !== null ? `${s.average.toFixed(2)}%` : '—',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 36, right: 36 },
    head: [['Category Group', 'Colleges Shown', 'Lowest Cutoff', 'Highest Cutoff', 'Average Cutoff']],
    body: analysisTableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
  });

  const finalAnalysisY = (doc as any).lastAutoTable?.finalY || currentY + 120;
  currentY = finalAnalysisY + 20;

  // Chance Description Notes Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('CHANCE CATEGORY DEFINITIONS (P = Student %):', 48, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Good Chance: cutoff is between P − 4 and P (under P).', 48, currentY + 27);
  doc.text('• Moderate Chance: cutoff is between P and P + 2.', 48, currentY + 39);
  doc.text('• Borderline: cutoff is between P + 2 and P + 6 (above P + 2).', 48, currentY + 51);
  doc.text('Colleges with cutoff below P − 4 or above P + 6 are not shown.', 400, currentY + 27);

  currentY += 76;

  // Disclaimer box on the final page (no "prediction", "predict", or "predicted")
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 70, 4, 4, 'FD');

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

  // Footer for analysis page
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Page ${pageCount} of ${pageCount} — Maharashtra DSE College Finder`,
    pageWidth / 2,
    pageHeight - 16,
    { align: 'center' }
  );

  // Filename: best_match_list_<P>_percent.pdf
  const filename = `best_match_list_${P}_percent.pdf`;
  doc.save(filename);

  return { success: true };
}
