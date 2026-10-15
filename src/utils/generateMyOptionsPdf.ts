import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadCutoffData } from '../services/dataService.ts';
import { getCollegeDistrict, collegeMatchesCity } from '../data/masterCollegeLocations.ts';

export interface GenerateMyOptionsPdfParams {
  studentName?: string;
  percentage: number;
  category: string;
  selectedBranches: string[];
  selectedCities: string[];
}

interface OptionsRow {
  collegeCode: string;
  collegeName: string;
  district: string;
  effectiveCutoff: number;
  cap1: number | null;
  cap2: number | null;
  cap3: number | null;
}

/**
 * PDF 2: MY CITY OPTIONS (Button: "⬇ My City Options (PDF)")
 * Header: Maharashtra DSE College Finder
 * Colleges in the selected cities, branches, and category whose effective cutoff >= P (no upper limit).
 * Group by city in the order selected. Sort highest to lowest within each city.
 * Columns: College Code | College Name | District | CAP 1 | CAP 2 | CAP 3 | Student %
 * Filename: my_city_options_<P>_percent.pdf
 */
export async function generateMyOptionsPdf(
  params: GenerateMyOptionsPdfParams
): Promise<{ success: boolean; message?: string }> {
  const { studentName, percentage: P, category, selectedBranches, selectedCities } = params;

  if (!selectedBranches || selectedBranches.length === 0) {
    return {
      success: false,
      message: 'Please select at least one branch.',
    };
  }

  const allCutoffs = await loadCutoffData();

  const branchSet = new Set(selectedBranches.map((b) => b.trim().toLowerCase()));
  const catTarget = category.trim().toLowerCase();

  const hasSelectedCities = selectedCities && selectedCities.length > 0;
  const cityGroups: { city: string; rows: OptionsRow[] }[] = [];
  let totalMatchCount = 0;

  if (hasSelectedCities) {
    for (const city of selectedCities) {
      const cityMatches: OptionsRow[] = [];
      const seenColleges = new Set<string>();

      for (const row of allCutoffs) {
        if (
          !branchSet.has(row.department.trim().toLowerCase()) ||
          row.category.trim().toLowerCase() !== catTarget
        ) {
          continue;
        }

        // Matches if selected city equals any location part or district of the college
        if (!collegeMatchesCity(row.collegeCode, city)) {
          continue;
        }

        // Effective cutoff = first non-empty value of CAP1, then CAP2, then CAP3.
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

        // Keep rows where effective cutoff >= P. No upper limit.
        if (effectiveCutoff < P) {
          continue;
        }

        const key = `${row.collegeCode}_${row.department}`;
        if (seenColleges.has(key)) continue;
        seenColleges.add(key);

        const district = getCollegeDistrict(row.collegeCode, row.collegeName);

        cityMatches.push({
          collegeCode: row.collegeCode || '—',
          collegeName: row.collegeName,
          district,
          effectiveCutoff,
          cap1: row.cap1,
          cap2: row.cap2,
          cap3: row.cap3,
        });
      }

      // Within each city, sort highest to lowest. Break ties by college name.
      cityMatches.sort((a, b) => {
        if (b.effectiveCutoff !== a.effectiveCutoff) {
          return b.effectiveCutoff - a.effectiveCutoff;
        }
        return a.collegeName.localeCompare(b.collegeName);
      });

      if (cityMatches.length > 0) {
        cityGroups.push({ city, rows: cityMatches });
        totalMatchCount += cityMatches.length;
      }
    }
  } else {
    // If no city is selected, group by verified district (no city filter)
    const districtMap = new Map<string, OptionsRow[]>();
    const seenColleges = new Set<string>();

    for (const row of allCutoffs) {
      if (
        !branchSet.has(row.department.trim().toLowerCase()) ||
        row.category.trim().toLowerCase() !== catTarget
      ) {
        continue;
      }

      let effectiveCutoff: number | null = null;
      if (row.cap1 !== null && !isNaN(row.cap1)) {
        effectiveCutoff = row.cap1;
      } else if (row.cap2 !== null && !isNaN(row.cap2)) {
        effectiveCutoff = row.cap2;
      } else if (row.cap3 !== null && !isNaN(row.cap3)) {
        effectiveCutoff = row.cap3;
      }

      if (effectiveCutoff === null || effectiveCutoff < P) {
        continue;
      }

      const key = `${row.collegeCode}_${row.department}`;
      if (seenColleges.has(key)) continue;
      seenColleges.add(key);

      const district = getCollegeDistrict(row.collegeCode, row.collegeName);
      if (!districtMap.has(district)) {
        districtMap.set(district, []);
      }
      districtMap.get(district)!.push({
        collegeCode: row.collegeCode || '—',
        collegeName: row.collegeName,
        district,
        effectiveCutoff,
        cap1: row.cap1,
        cap2: row.cap2,
        cap3: row.cap3,
      });
    }

    const sortedDistricts = Array.from(districtMap.keys()).sort();
    for (const dist of sortedDistricts) {
      const rows = districtMap.get(dist)!;
      rows.sort((a, b) => {
        if (b.effectiveCutoff !== a.effectiveCutoff) {
          return b.effectiveCutoff - a.effectiveCutoff;
        }
        return a.collegeName.localeCompare(b.collegeName);
      });
      cityGroups.push({ city: dist, rows });
      totalMatchCount += rows.length;
    }
  }

  // If no city has matches, do not create a PDF.
  if (totalMatchCount === 0 || cityGroups.length === 0) {
    return {
      success: false,
      message: 'No colleges found for the selected branches, cities, and cutoff range.',
    };
  }

  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 36;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 43, 73);
  doc.text('Maharashtra DSE College Finder', pageWidth / 2, currentY, { align: 'center' });
  currentY += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('My City Options (Eligible CAP Cutoffs — Cutoff ≥ P%)', pageWidth / 2, currentY, { align: 'center' });
  currentY += 22;

  // Header: student name, percentage, category, selected branches, selected cities, generation date
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 75, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1X = 48;
  const col2X = 220;
  const col3X = 390;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', col1X, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(studentName && studentName.trim() ? studentName.trim() : '—', col1X, currentY + 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Diploma Percentage (P):', col2X, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${P}% (Filter: Cutoff ≥ ${P}%)`, col2X, currentY + 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Category:', col3X, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(category, col3X, currentY + 32);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Selected Branches:', col1X, currentY + 48);
  doc.setFont('helvetica', 'normal');
  const branchesStr = selectedBranches.join(', ');
  const branchesDisplay = branchesStr.length > 36 ? branchesStr.slice(0, 34) + '...' : branchesStr;
  doc.text(branchesDisplay, col1X, currentY + 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Selected Cities:', col2X, currentY + 48);
  doc.setFont('helvetica', 'normal');
  const citiesStr = selectedCities && selectedCities.length > 0 ? selectedCities.join(', ') : 'All Cities';
  const citiesDisplay = citiesStr.length > 30 ? citiesStr.slice(0, 28) + '...' : citiesStr;
  doc.text(citiesDisplay, col2X, currentY + 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Generation Date:', col3X, currentY + 48);
  doc.setFont('helvetica', 'normal');
  const genDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(genDate, col3X, currentY + 62);

  currentY += 92;

  const fmt = (v: number | null) => (v !== null && !isNaN(v) ? `${v.toFixed(2)}%` : '—');

  // Render each city group
  cityGroups.forEach((group) => {
    if (currentY > doc.internal.pageSize.getHeight() - 110) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`City: ${group.city} (${group.rows.length} college${group.rows.length > 1 ? 's' : ''})`, 36, currentY);
    currentY += 10;

    // Table columns, exactly: College Code | College Name | District | CAP 1 | CAP 2 | CAP 3 | Student %
    const tableData = group.rows.map((row) => [
      row.collegeCode,
      row.collegeName,
      row.district,
      fmt(row.cap1),
      fmt(row.cap2),
      fmt(row.cap3),
      `${P}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 36, right: 36 },
      head: [['College Code', 'College Name', 'District', 'CAP 1', 'CAP 2', 'CAP 3', 'Student %']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
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
        0: { cellWidth: 55, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 60, halign: 'left' },
        3: { cellWidth: 45, halign: 'right' },
        4: { cellWidth: 45, halign: 'right' },
        5: { cellWidth: 45, halign: 'right' },
        6: { cellWidth: 50, halign: 'center' },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} — Maharashtra DSE College Finder`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY;
    currentY = (finalY || currentY) + 22;
  });

  // Chance Description note & Disclaimer box at the end
  if (currentY > doc.internal.pageSize.getHeight() - 170) {
    doc.addPage();
    currentY = 40;
  }

  // Chance Description Note Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, currentY, pageWidth - 72, 60, 4, 4, 'FD');

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
  doc.text('Colleges with cutoff below P − 4 or above P + 6 are not shown.', 330, currentY + 27);

  currentY += 70;

  if (currentY > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    currentY = 40;
  }

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

  // Filename: my_city_options_<P>_percent.pdf
  const filename = `my_city_options_${P}_percent.pdf`;
  doc.save(filename);

  return { success: true };
}
