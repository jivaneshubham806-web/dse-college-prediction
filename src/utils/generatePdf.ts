import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PredictionResult } from '../types/index.ts';

export function generatePdf(
  predictions: PredictionResult[],
  percentage: number,
  branch: string,
  category: string,
  studentName?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 43, 73);
  doc.text('Maharashtra DSE College Finder', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const namePart = studentName && studentName.trim() ? `Student: ${studentName.trim()} | ` : '';
  doc.text(
    `${namePart}Diploma: ${percentage}% | Category: ${category} | Total Colleges: ${predictions.length}`,
    pageWidth / 2,
    44,
    { align: 'center' }
  );

  const fmt = (v: number | null) => (v !== null && !isNaN(v) ? `${v.toFixed(2)}%` : '—');

  // Columns: College Code | College Name | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student %
  const rows = predictions.map((p) => [
    p.collegeCode,
    p.collegeName,
    p.district || p.city,
    p.department,
    fmt(p.cap1),
    fmt(p.cap2),
    fmt(p.cap3),
    p.latestCutoff !== null && !isNaN(p.latestCutoff) ? `${p.latestCutoff.toFixed(2)}%` : '—',
    p.status,
    `${percentage}%`,
  ]);

  autoTable(doc, {
    startY: 56,
    margin: { left: 36, right: 36, bottom: 30 },
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
    body: rows,
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
        pageHeight - 14,
        { align: 'center' }
      );
    },
  });

  doc.save(`college_list_max_${percentage}_percent.pdf`);
}
