import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PredictionResult } from '../types/index.ts';

export function generateCollegeListBasicPdf(
  predictions: PredictionResult[],
  percentage: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Maharashtra DSE College Admission List (Basic Summary)', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Student Diploma Percentage: ${percentage}%`, pageWidth / 2, 28, { align: 'center' });

  const rows = predictions.map((p) => [
    p.collegeCode,
    p.collegeName,
    p.city,
    p.department,
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['College Code', 'College Name', 'City', 'Department']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save(`dse_college_list_basic_${percentage}.pdf`);
}
