export type ActiveSection = 'home' | 'prediction' | 'explorer';

export type ChanceCategory = 'Good Chance' | 'Moderate Chance' | 'Borderline';

export interface CutoffRecord {
  collegeCode: string;
  collegeName: string;
  department: string;
  category: string;
  city: string;
  cap1: number | null;
  cap2: number | null;
  cap3: number | null;
  latestCutoff: number | null;
  predictedCap3: number | null;
}

export interface PredictionResult {
  collegeCode: string;
  collegeName: string;
  district: string;
  department: string;
  category: string;
  city: string;
  latestCutoff: number | null;
  cap1: number | null;
  cap2: number | null;
  cap3: number | null;
  predictedCap3: number | null;
  status: ChanceCategory;
  diff: number;
}

export interface PredictionFilter {
  studentName?: string;
  percentage: number;
  department?: string;
  selectedBranches: string[];
  category: string;
  selectedCities: string[];
}
