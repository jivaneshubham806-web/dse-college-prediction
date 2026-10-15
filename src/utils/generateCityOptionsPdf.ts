import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadCutoffData } from '../services/dataService.ts';

export interface GenerateCityPdfParams {
  percentage: number;
  department: string;
  category: string;
  selectedCities: string[];
}

interface ProcessedRow {
  collegeCode: string;
  collegeName: string;
  effectiveCutoff: number;
  cap1: number | null;
  cap2: number | null;
  cap3: number | null;
}

/**
 * Creates and downloads a city-wise PDF based on student percentage P, branch, category, and selected cities.
 * Returns true if PDF was created, or false if no colleges matched.
 */
export async function generateCityOptionsPdf(
  params: GenerateCityPdfParams
): Promise<{ success: boolean; message?: string }> {
  const { percentage: P, department, category, selectedCities } = params;

  // 1. Load cutoff data from public/cleaned_dse_cutoff_data.csv
  const allCutoffs = await loadCutoffData();

  // If no cities specified, return notice
  if (!selectedCities || selectedCities.length === 0) {
    return {
      success: false,
      message: 'Please select at least one city (up to 3 cities).',
    };
  }

  // Take up to 3 selected cities
  const citiesToProcess = selectedCities.slice(0, 3);

  // Group matches by city in the order selected
  const cityGroups: { city: string; rows: ProcessedRow[] }[] = [];
  let totalMatchCount = 0;

  for (const city of citiesToProcess) {
    const cityMatches: ProcessedRow[] = [];

    // Filter by branch (exact Department match), category (exact match), and city
    for (const row of allCutoffs) {
      if (
        row.department.trim() !== department.trim() ||
        row.category.trim() !== category.trim() ||
        row.city.trim().toLowerCase() !== city.trim().toLowerCase()
      ) {
        continue;
      }

      // 2. Effective cutoff = first non-empty value of CAP1, then CAP2, then CAP3.
      // Ignore Latest_Cutoff. Exclude rows where all three are empty.
      let effectiveCutoff: number | null = null;
      if (row.cap1 !== null && !isNaN(row.cap1)) {
        effectiveCutoff = row.cap1;
      } else if (row.cap2 !== null && !isNaN(row.cap2)) {
        effectiveCutoff = row.cap2;
      } else if (row.cap3 !== null && !isNaN(row.cap3)) {
        effectiveCutoff = row.cap3;
      }

      if (effectiveCutoff === null) {
        continue; // Exclude rows where all three are empty
      }

      // 3. Keep rows where effective cutoff >= P, with no upper limit.
      if (effectiveCutoff < P) {
        continue;
      }

      cityMatches.push({
        collegeCode: row.collegeCode || '—',
        collegeName: row.collegeName,
        effectiveCutoff,
        cap1: row.cap1,
        cap2: row.cap2,
        cap3: row.cap3,
      });
    }

    // 4. Within each city, sort highest to lowest cutoff. Break ties by college name.
    cityMatches.sort((a, b) => {
      if (b.effectiveCutoff !== a.effectiveCutoff) {
        return b.effectiveCutoff - a.effectiveCutoff;
      }
      return a.collegeName.localeCompare(b.collegeName);
    });

    // 6. Skip cities with no matches
    if (cityMatches.length > 0) {
      cityGroups.push({ city, rows: cityMatches });
      totalMatchCount += cityMatches.length;
    }
  }

  // 6. If nothing matches across all cities, do not create a PDF.
  if (totalMatchCount === 0 || cityGroups.length === 0) {
    return {
      success: false,
      message: 'No colleges found in the selected branch, city, and cutoff range.',
    };
  }

  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 43, 73);
  doc.text('Maharashtra DSE College Admission System', pageWidth / 2, currentY, { align: 'center' });
  currentY += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('City-Wise Recommended College List (CAP Cutoffs)', pageWidth / 2, currentY, { align: 'center' });
  currentY += 25;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 60, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1X = 48;
  const col2X = 220;
  const col3X = 400;

  doc.setFont('helvetica', 'bold');
  doc.text('Diploma Percentage (P):', col1X, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`${P}% (Filter: Cutoff ≥ ${P}%)`, col1X, currentY + 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Selected Branch:', col2X, currentY + 22);
  doc.setFont('helvetica', 'normal');
  const branchShort = department.length > 28 ? department.slice(0, 26) + '...' : department;
  doc.text(branchShort, col2X, currentY + 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Category / Quota:', col3X, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(category, col3X, currentY + 38);

  currentY += 80;

  // Helper for formatting cutoff percentage
  const fmt = (v: number | null) => (v !== null && !isNaN(v) ? `${v.toFixed(2)}%` : '—');

  // Render each city section
  cityGroups.forEach((group, index) => {
    // Check if new page needed before city title
    if (currentY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`City: ${group.city} (${group.rows.length} college${group.rows.length > 1 ? 's' : ''})`, 36, currentY);
    currentY += 10;

    // 5. Each city section has a table with exactly these columns:
    // College Code | College Name | CAP 1 | CAP 2 | CAP 3
    // Show "—" for empty values. Add no other columns.
    const tableData = group.rows.map((row) => [
      row.collegeCode,
      row.collegeName,
      fmt(row.cap1),
      fmt(row.cap2),
      fmt(row.cap3),
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 36, right: 36 },
      head: [['College Code', 'College Name', 'CAP 1', 'CAP 2', 'CAP 3']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 70, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 55, halign: 'right' },
        3: { cellWidth: 55, halign: 'right' },
        4: { cellWidth: 55, halign: 'right' },
      },
      didDrawPage: (data) => {
        // Footer page numbering
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} — Maharashtra DSE Admissions Portal`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY;
    currentY = (finalY || currentY) + 25;
  });

  // 7. Filename: college_list_city_wise_<P>_percent.pdf
  const filename = `college_list_city_wise_${P}_percent.pdf`;
  doc.save(filename);

  return { success: true };
}
