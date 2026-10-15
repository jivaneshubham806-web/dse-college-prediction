import Papa from 'papaparse';
import { CutoffRecord, PredictionResult, ChanceCategory } from '../types/index.ts';
import {
  MASTER_COLLEGE_LOCATIONS,
  DTE_REGION_FALLBACK,
  COMMON_CITIES,
  POPULAR_BRANCHES,
  CATEGORIES,
  getCollegeDistrict,
  collegeMatchesCities,
  ALL_DISTINCT_CITIES,
} from '../data/masterCollegeLocations.ts';

let cachedCutoffData: CutoffRecord[] | null = null;
let cachedPredictionData: any[] | null = null;

function extractCity(row: any, code: string, name: string): string {
  // 1. Direct column in row
  const cityKey = Object.keys(row).find((k) => /^(city|district|location)$/i.test(k.trim()));
  if (cityKey && row[cityKey] && typeof row[cityKey] === 'string' && row[cityKey].trim()) {
    return row[cityKey].trim();
  }

  // 2. Lookup by code in master locations
  if (code && MASTER_COLLEGE_LOCATIONS[code]) {
    return MASTER_COLLEGE_LOCATIONS[code].city;
  }

  // 3. Search in college name
  const lowerName = (name || '').toLowerCase();
  for (const city of COMMON_CITIES) {
    if (lowerName.includes(city.toLowerCase())) {
      return city;
    }
  }

  // 4. Fallback based on DTE Maharashtra Institute Code Region prefix
  // 1xxx: Amravati, 2xxx: Chhatrapati Sambhajinagar, 3xxx: Mumbai, 4xxx: Nagpur, 5xxx: Nashik, 6xxx: Pune
  if (code && code.length >= 1 && DTE_REGION_FALLBACK[code[0]]) {
    return DTE_REGION_FALLBACK[code[0]];
  }

  return 'Other';
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().replace(/%/g, '');
  if (!s || s === '-' || s === '—' || s === 'NA' || s === 'N/A' || s === 'nan' || s === 'NaN') return null;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

export async function loadCutoffData(): Promise<CutoffRecord[]> {
  if (cachedCutoffData && cachedCutoffData.length > 0) {
    return cachedCutoffData;
  }

  // Priority order for reading DSE data:
  // 1. /cleaned_dse_cutoff_data_with_predictions.csv
  // 2. /cleaned_dse_cutoff_data.csv
  const filesToTry = [
    '/cleaned_dse_cutoff_data_with_predictions.csv',
    '/cleaned_dse_cutoff_data.csv',
  ];

  for (const filePath of filesToTry) {
    try {
      const res = await fetch(filePath);
      if (!res.ok) continue;

      const csvText = await res.text();
      const parsed = Papa.parse<any>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (!parsed.data || parsed.data.length === 0) continue;

      const records: CutoffRecord[] = parsed.data
        .map((row: any) => {
          // Find keys flexibly
          const codeKey = Object.keys(row).find((k) =>
            /^(institute[_\s]?code|college[_\s]?code|code)$/i.test(k.trim())
          );
          const nameKey = Object.keys(row).find((k) =>
            /^(institute|college[_\s]?name|institute[_\s]?name|college)$/i.test(k.trim())
          );
          const deptKey = Object.keys(row).find((k) =>
            /^(department|branch|course)$/i.test(k.trim())
          );
          const catKey = Object.keys(row).find((k) =>
            /^(category|seat[_\s]?type|quota)$/i.test(k.trim())
          );
          const cap1Key = Object.keys(row).find((k) =>
            /^(cap[_\s]?1|cap[_\s]?round[_\s]?1)$/i.test(k.trim())
          );
          const cap2Key = Object.keys(row).find((k) =>
            /^(cap[_\s]?2|cap[_\s]?round[_\s]?2)$/i.test(k.trim())
          );
          const cap3Key = Object.keys(row).find((k) =>
            /^(cap[_\s]?3|cap[_\s]?round[_\s]?3)$/i.test(k.trim())
          );
          const predictedCap3Key = Object.keys(row).find((k) =>
            /^(predicted[_\s]?cap3|predicted[_\s]?cap[_\s]?3|predicted[_\s]?cutoff|predicted)$/i.test(k.trim())
          );

          let name = nameKey && row[nameKey] ? String(row[nameKey]).trim() : '';
          let code = codeKey && row[codeKey] ? String(row[codeKey]).trim() : '';

          // If code is empty but name has 4 digits at start
          if (!code && name) {
            const match = name.match(/^(\d{4})/);
            if (match) {
              code = match[1];
            }
          }

          const city = extractCity(row, code, name);
          const cap1 = cap1Key ? parseNumber(row[cap1Key]) : null;
          const cap2 = cap2Key ? parseNumber(row[cap2Key]) : null;
          const cap3 = cap3Key ? parseNumber(row[cap3Key]) : null;

          // Logic 2: Latest cutoff = CAP3 if available, else CAP2, else CAP1.
          // Ignore Predicted_CAP3 for classification.
          const latestCutoff = cap3 ?? cap2 ?? cap1;

          // Predicted_CAP3 value (if available in row)
          const predictedCap3 = predictedCap3Key ? parseNumber(row[predictedCap3Key]) : null;

          return {
            collegeCode: code || '—',
            collegeName: name || 'Unknown College',
            department: deptKey && row[deptKey] ? String(row[deptKey]).trim() : '',
            category: catKey && row[catKey] ? String(row[catKey]).trim() : 'GOPEN',
            city,
            cap1,
            cap2,
            cap3,
            latestCutoff,
            predictedCap3,
          };
        })
        // Logic 1: Use all records. Do NOT filter out records because Predicted_CAP3 is empty.
        .filter((r) => r.department && r.collegeName);

      if (records.length > 0) {
        cachedCutoffData = records;
        return cachedCutoffData;
      }
    } catch (err) {
      console.warn(`Error reading ${filePath}:`, err);
    }
  }

  return [];
}

export async function loadPredictionsData(): Promise<any[]> {
  if (cachedPredictionData && cachedPredictionData.length > 0) {
    return cachedPredictionData;
  }

  try {
    const res = await fetch('/dse_predictions_main.csv');
    if (!res.ok) {
      return [];
    }
    const csvText = await res.text();
    const parsed = Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    cachedPredictionData = parsed.data || [];
    return cachedPredictionData;
  } catch (err) {
    console.warn('Error reading dse_predictions_main.csv:', err);
    return [];
  }
}

export async function getFilterOptions(): Promise<{
  branches: string[];
  categories: string[];
  cities: string[];
}> {
  const data = await loadCutoffData();
  const branchSet = new Set<string>();
  const catSet = new Set<string>();
  const citySet = new Set<string>();

  data.forEach((r) => {
    if (r.department) branchSet.add(r.department);
    if (r.category) catSet.add(r.category);
    if (r.city && r.city !== 'Other') citySet.add(r.city);
  });

  const branches = branchSet.size > 0 ? Array.from(branchSet).sort() : POPULAR_BRANCHES;
  const categories = catSet.size > 0 ? Array.from(catSet).sort() : CATEGORIES;
  const cities = ALL_DISTINCT_CITIES;

  return { branches, categories, cities };
}

/**
 * Predict suitable colleges for the student based on percentage, branch, category, and selected cities.
 * Logic:
 * 1. Use all records. Do not filter out records because Predicted_CAP3 is empty.
 * 2. Latest cutoff = CAP3 if available, else CAP2, else CAP1.
 * 3. Difference = student percentage − latest cutoff.
 * 4. City matching matches if selected city equals any location part or district of the college.
 */
export async function getPredictions(
  percentage: number,
  departmentOrBranches: string | string[],
  category: string,
  selectedCities: string[]
): Promise<PredictionResult[]> {
  const cutoffs = await loadCutoffData();

  const branches = Array.isArray(departmentOrBranches)
    ? departmentOrBranches.map((b) => b.trim().toLowerCase())
    : [departmentOrBranches.trim().toLowerCase()];

  // 1. Filter matching branch and category (exact match)
  let matches = cutoffs.filter(
    (c) =>
      branches.includes(c.department.trim().toLowerCase()) &&
      c.category.trim().toLowerCase() === category.trim().toLowerCase()
  );

  // 2. City filter: if cities are selected, filter by cities using verified location parts and district
  if (selectedCities && selectedCities.length > 0) {
    matches = matches.filter((c) => collegeMatchesCities(c.collegeCode, selectedCities));
  }

  // 3. Deduplicate by collegeCode + department (preserving row with latest information)
  const uniqueMap = new Map<string, CutoffRecord>();
  matches.forEach((item) => {
    const key = `${item.collegeCode}_${item.department}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });

  const results: PredictionResult[] = [];

  for (const item of uniqueMap.values()) {
    // Latest cutoff = CAP3 if available, else CAP2, else CAP1
    const cutoff = item.latestCutoff ?? item.cap3 ?? item.cap2 ?? item.cap1;

    // If no cutoff is recorded at all, cannot compute difference
    if (cutoff === null || isNaN(cutoff)) {
      continue;
    }

    // Difference = student percentage − latest cutoff
    const diff = percentage - cutoff;

    // Colleges below P − 4 or above P + 6 are not shown
    if (cutoff < percentage - 4 || cutoff > percentage + 6) {
      continue;
    }

    let status: ChanceCategory;
    if (cutoff >= percentage - 4 && cutoff < percentage) {
      status = 'Good Chance';
    } else if (cutoff >= percentage && cutoff <= percentage + 2) {
      status = 'Moderate Chance';
    } else {
      status = 'Borderline';
    }

    results.push({
      collegeCode: item.collegeCode,
      collegeName: item.collegeName,
      district: getCollegeDistrict(item.collegeCode, item.collegeName),
      department: item.department,
      category: item.category,
      city: item.city,
      latestCutoff: cutoff,
      cap1: item.cap1,
      cap2: item.cap2,
      cap3: item.cap3,
      predictedCap3: item.predictedCap3,
      status,
      diff,
    });
  }

  // Sort by cutoff descending (highest cutoff to lowest)
  return results.sort((a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0));
}

export interface ExplorerCutoffRecord {
  instituteCode: string;
  institute: string;
  department: string;
  category: string;
  cap1: string;
  cap2: string;
  cap3: string;
}

export interface InstituteOption {
  code: string;
  name: string;
}

let cachedExplorerRecords: ExplorerCutoffRecord[] | null = null;
let cachedExplorerInstitutes: InstituteOption[] | null = null;

/**
 * Loads cutoff records specifically for the College Cutoff Explorer using
 * public/cleaned_dse_cutoff_data_with_predictions.csv as the single data source.
 */
export async function loadCutoffExplorerData(): Promise<{
  institutes: InstituteOption[];
  records: ExplorerCutoffRecord[];
}> {
  if (cachedExplorerRecords && cachedExplorerInstitutes) {
    return {
      institutes: cachedExplorerInstitutes,
      records: cachedExplorerRecords,
    };
  }

  const res = await fetch('/cleaned_dse_cutoff_data_with_predictions.csv');
  if (!res.ok) {
    throw new Error('Failed to load /cleaned_dse_cutoff_data_with_predictions.csv');
  }

  const csvText = await res.text();
  const parsed = Papa.parse<any>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const records: ExplorerCutoffRecord[] = [];
  const instMap = new Map<string, string>();

  for (const row of parsed.data) {
    const code = (row.Institute_Code || row.institute_code || row['Institute Code'] || '').trim();
    const name = (row.Institute || row.institute || row['Institute Name'] || '').trim();
    const dept = (row.Department || row.department || row.Branch || '').trim();
    const cat = (row.Category || row.category || '').trim();
    const cap1 = row.CAP1 !== undefined && row.CAP1 !== null ? String(row.CAP1).trim() : '';
    const cap2 = row.CAP2 !== undefined && row.CAP2 !== null ? String(row.CAP2).trim() : '';
    const cap3 = row.CAP3 !== undefined && row.CAP3 !== null ? String(row.CAP3).trim() : '';

    if (!name && !code) continue;

    if (code && name && !instMap.has(code)) {
      instMap.set(code, name);
    }

    records.push({
      instituteCode: code,
      institute: name,
      department: dept,
      category: cat,
      cap1,
      cap2,
      cap3,
    });
  }

  const institutes: InstituteOption[] = Array.from(instMap.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => {
      // Sort primarily by code or name
      const numA = parseInt(a.code, 10);
      const numB = parseInt(b.code, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name);
    });

  cachedExplorerRecords = records;
  cachedExplorerInstitutes = institutes;

  return { institutes, records };
}

