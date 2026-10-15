/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sparkles,
  Search,
  X,
  Check,
  User,
  Loader2,
  Building,
} from 'lucide-react';
import { PredictionResult, ChanceCategory } from '../types/index.ts';
import { getFilterOptions, getPredictions } from '../services/dataService.ts';
import { ALL_DISTINCT_CITIES } from '../data/masterCollegeLocations.ts';
import { generateMyOptionsPdf } from '../utils/generateMyOptionsPdf.ts';
import { generatePredictedList101010Pdf } from '../utils/generatePredictedList101010Pdf.ts';
import { generateCapRoundOptionListPdf } from '../utils/generateCapRoundOptionListPdf.ts';

interface CollegePredictionSectionProps {
  onBackToHome: () => void;
}

export const CollegePredictionSection: React.FC<CollegePredictionSectionProps> = ({ onBackToHome }) => {
  // Required fields: Student Name, Diploma Percentage, Category, and at least one Branch
  const [studentName, setStudentName] = useState<string>('');

  // Percentage & Category
  const [percentage, setPercentage] = useState<number>(85.0);
  const [percentageInput, setPercentageInput] = useState<string>('85.0');
  const [selectedCategory, setSelectedCategory] = useState<string>('GOPEN');

  // Branch Multi-select (Starts EMPTY - no auto-selected branch)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState<string>('');

  // Preferred City Multi-select (OPTIONAL: if none selected, do not filter by city)
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState<string>('');

  // Form submission attempt tracker
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  // Options from dataset
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>(ALL_DISTINCT_CITIES);

  // Results & status
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [pdfGeneratingType, setPdfGeneratingType] = useState<
    'best_match' | 'city_options' | 'cap_round' | null
  >(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<'ALL' | ChanceCategory>('ALL');

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Results reference for smooth scrolling
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Validation rules for required fields
  const studentNameError = useMemo(() => {
    if (!studentName || studentName.trim() === '') {
      return 'Student Name is required.';
    }
    return null;
  }, [studentName]);

  const percentageError = useMemo(() => {
    if (!percentageInput || percentageInput.trim() === '') {
      return 'Diploma Percentage is required.';
    }
    const val = parseFloat(percentageInput);
    if (isNaN(val)) return 'Please enter a valid percentage score.';
    if (val < 35 || val > 100) return 'Percentage must be between 35.00% and 100.00%.';
    return null;
  }, [percentageInput]);

  const categoryError = useMemo(() => {
    if (!selectedCategory || selectedCategory.trim() === '') {
      return 'Candidate Category is required.';
    }
    return null;
  }, [selectedCategory]);

  const branchError = useMemo(() => {
    if (selectedBranches.length === 0) {
      return 'Please select at least one branch.';
    }
    return null;
  }, [selectedBranches]);

  // Load filter options on mount
  useEffect(() => {
    async function loadOptions() {
      const opts = await getFilterOptions();
      setBranchOptions(opts.branches);
      setCategoryOptions(opts.categories);
      if (opts.cities && opts.cities.length > 0) {
        setCityOptions(opts.cities);
      }

      if (opts.categories.length > 0) {
        if (opts.categories.includes('GOPEN')) {
          setSelectedCategory('GOPEN');
        } else if (opts.categories.includes('OPEN')) {
          setSelectedCategory('OPEN');
        } else {
          setSelectedCategory(opts.categories[0]);
        }
      }
      // Branches start empty as requested: do NOT auto-select branch
    }
    loadOptions();
  }, []);

  // Update numeric percentage when input is valid
  useEffect(() => {
    const val = parseFloat(percentageInput);
    if (!isNaN(val) && val >= 35 && val <= 100) {
      setPercentage(val);
    }
  }, [percentageInput]);

  // Branch search filter
  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branchOptions;
    return branchOptions.filter((b) => b.toLowerCase().includes(q));
  }, [branchOptions, branchSearch]);

  const handleBranchToggle = (branch: string) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleSelectAllFilteredBranches = () => {
    const combined = Array.from(new Set([...selectedBranches, ...filteredBranches]));
    setSelectedBranches(combined);
  };

  const handleClearBranches = () => {
    setSelectedBranches([]);
  };

  // City search filter - builds options from distinct parts and districts across all 363 colleges
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cityOptions;
    return cityOptions.filter((c) => c.toLowerCase().includes(q));
  }, [cityOptions, citySearch]);

  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter((c) => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  // Main Find Colleges action
  const handleFindColleges = async () => {
    setHasAttemptedSubmit(true);

    if (studentNameError || percentageError || categoryError || branchError) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 2.5 second animation: "Finding colleges for you…"
      const resultsPromise = getPredictions(
        percentage,
        selectedBranches,
        selectedCategory,
        selectedCities // if empty, getPredictions searches all cities
      );

      const [results] = await Promise.all([
        resultsPromise,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      setPredictions(results);
      setHasSearched(true);

      if (results.length > 0) {
        setSuccessMessage('Successfully found colleges');
      } else {
        setSuccessMessage(null);
      }

      // Scroll smoothly down to the results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load cutoff recommendations. Please check the data connection.');
    } finally {
      setLoading(false);
    }
  };

  // Group counts based on new chance ranges, sorted highest cutoff to lowest
  const goodChanceColleges = useMemo(
    () =>
      [...predictions.filter((p) => p.status === 'Good Chance')].sort(
        (a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0)
      ),
    [predictions]
  );
  const moderateChanceColleges = useMemo(
    () =>
      [...predictions.filter((p) => p.status === 'Moderate Chance')].sort(
        (a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0)
      ),
    [predictions]
  );
  const borderlineColleges = useMemo(
    () =>
      [...predictions.filter((p) => p.status === 'Borderline')].sort(
        (a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0)
      ),
    [predictions]
  );

  const displayedColleges = useMemo(() => {
    if (activeGroupFilter === 'ALL') return predictions;
    return predictions.filter((p) => p.status === activeGroupFilter);
  }, [predictions, activeGroupFilter]);

  // Handler for PDF 1: BEST MATCH LIST (10:10:10 list)
  const handleDownloadBestMatchPdf = () => {
    setErrorMessage(null);

    if (predictions.length === 0) {
      setErrorMessage('No colleges found for the selected branches, cities, and cutoff range.');
      return;
    }

    setPdfGeneratingType('best_match');
    try {
      const res = generatePredictedList101010Pdf({
        predictions,
        studentName,
        percentage,
        category: selectedCategory,
        selectedBranches,
        selectedCities,
      });

      if (!res.success) {
        setErrorMessage(
          res.message || 'No colleges found for the selected branches, cities, and cutoff range.'
        );
      } else {
        setSuccessMessage(`Downloaded: best_match_list_${percentage}_percent.pdf`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Best Match PDF Error:', err);
      setErrorMessage('An unexpected error occurred while generating Best Match List PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  // Handler for PDF 2: MY CITY OPTIONS (Cutoff >= P)
  const handleDownloadMyCityOptionsPdf = async () => {
    setErrorMessage(null);

    if (branchError || percentageError) {
      setErrorMessage('Please select branches and a valid percentage before downloading the PDF.');
      return;
    }

    setPdfGeneratingType('city_options');
    try {
      const res = await generateMyOptionsPdf({
        studentName,
        percentage,
        category: selectedCategory,
        selectedBranches,
        selectedCities,
      });

      if (!res.success) {
        setErrorMessage(
          res.message || 'No colleges found for the selected branches, cities, and cutoff range.'
        );
      } else {
        setSuccessMessage(`Downloaded: my_city_options_${percentage}_percent.pdf`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('My City Options PDF Error:', err);
      setErrorMessage('An unexpected error occurred while generating My City Options PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  // Handler for PDF 3: CAP ROUND OPTION LIST (Cutoff <= P + 6)
  const handleDownloadCapRoundOptionListPdf = () => {
    setErrorMessage(null);

    if (predictions.length === 0) {
      setErrorMessage('No colleges found for the selected branches, cities, and cutoff range.');
      return;
    }

    setPdfGeneratingType('cap_round');
    try {
      const res = generateCapRoundOptionListPdf({
        predictions,
        studentName,
        percentage,
        category: selectedCategory,
        selectedBranches,
        selectedCities,
      });

      if (!res.success) {
        setErrorMessage(
          res.message || 'No colleges found for the selected branches, cities, and cutoff range.'
        );
      } else {
        setSuccessMessage(`Downloaded: cap_round_option_list_${percentage}_percent.pdf`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('CAP Round Option List PDF Error:', err);
      setErrorMessage('An unexpected error occurred while generating CAP Round Option List PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const renderCollegeTable = (colleges: PredictionResult[], emptyMsg: string) => {
    if (colleges.length === 0) {
      return (
        <div className="py-8 px-4 text-center text-xs text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
          <p className="font-medium text-slate-600">{emptyMsg}</p>
          <p className="text-[11px] text-slate-400 mt-1">Try selecting additional branches, cities, or adjusting your filters.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        {/* Columns: College Code | College Name | District | Branch | CAP 1 | CAP 2 | CAP 3 | Latest Cutoff | Chance | Student % */}
        <table className="w-full text-left text-sm text-slate-700 min-w-[780px]">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-3">College Code</th>
              <th scope="col" className="px-4 py-3">College Name</th>
              <th scope="col" className="px-4 py-3">District</th>
              <th scope="col" className="px-4 py-3">Branch</th>
              <th scope="col" className="px-4 py-3 text-right">CAP 1</th>
              <th scope="col" className="px-4 py-3 text-right">CAP 2</th>
              <th scope="col" className="px-4 py-3 text-right">CAP 3</th>
              <th scope="col" className="px-4 py-3 text-right">Latest Cutoff</th>
              <th scope="col" className="px-4 py-3 text-center">Chance</th>
              <th scope="col" className="px-4 py-3 text-center">Student %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {colleges.map((p, idx) => {
              const statusBadgeClass =
                p.status === 'Good Chance'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : p.status === 'Moderate Chance'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300';

              return (
                <tr key={`${p.collegeCode}-${p.department}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">
                    {p.collegeCode}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900">
                    {p.collegeName}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">
                    {p.district || p.city}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                    {p.department}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">
                    {p.cap1 !== null && !isNaN(p.cap1) ? `${p.cap1.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">
                    {p.cap2 !== null && !isNaN(p.cap2) ? `${p.cap2.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">
                    {p.cap3 !== null && !isNaN(p.cap3) ? `${p.cap3.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 text-xs">
                    {p.latestCutoff !== null && !isNaN(p.latestCutoff) ? `${p.latestCutoff.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-700">
                    {percentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* Deep Navy Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
              <span>← Back to Home</span>
            </button>
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />
            <span className="font-bold text-white text-sm sm:text-base hidden sm:inline-block">
              Maharashtra DSE College Finder
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-900/60 text-blue-200 border border-blue-700/60">
            Find My Colleges
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-3xl select-none" aria-hidden="true">
              🎯
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Find My Colleges
              </h1>
              <p className="mt-2 text-slate-600 leading-relaxed max-w-3xl text-sm sm:text-base">
                Find suitable Maharashtra DSE colleges based on your diploma percentage, branch and category.
              </p>
            </div>
          </div>
        </div>

        {/* Global Notifications: Amber for warning/errors, Green/Teal for success */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Profile Input Form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span>Student Admission Profile</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Student Name (REQUIRED) */}
            <div>
              <label htmlFor="student-name-input" className="block text-sm font-medium text-slate-700 mb-1">
                Student Name <span className="text-red-500 font-bold">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Required for generating your personalized reports.</p>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-name-input"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:outline-hidden text-sm ${
                    hasAttemptedSubmit && studentNameError
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              {hasAttemptedSubmit && studentNameError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{studentNameError}</span>
                </p>
              )}
            </div>

            {/* 2. Diploma Aggregate Percentage P (REQUIRED) */}
            <div>
              <label htmlFor="percentage-input" className="block text-sm font-medium text-slate-700 mb-1">
                Diploma Aggregate Percentage (P) <span className="text-red-500 font-bold">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Enter your final diploma aggregate score (35.00 - 100.00).</p>
              <div className="relative rounded-lg shadow-xs">
                <input
                  id="percentage-input"
                  type="number"
                  min="35"
                  max="100"
                  step="0.01"
                  value={percentageInput}
                  onChange={(e) => setPercentageInput(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:outline-hidden text-sm ${
                    hasAttemptedSubmit && percentageError
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="e.g. 85.50"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-medium">
                  %
                </div>
              </div>
              {hasAttemptedSubmit && percentageError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{percentageError}</span>
                </p>
              )}
            </div>

            {/* 3. Candidate Category (REQUIRED) */}
            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-slate-700 mb-1">
                Candidate Category <span className="text-red-500 font-bold">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Matches exact CET Cell CAP seat quota.</p>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:outline-hidden text-sm ${
                  hasAttemptedSubmit && categoryError
                    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {hasAttemptedSubmit && categoryError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{categoryError}</span>
                </p>
              )}
            </div>
          </div>

          {/* 4. Engineering Branches (REQUIRED - manual selection, no auto-select) */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Engineering Branches <span className="text-red-500 font-bold">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select one or more departments from the list below.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    selectedBranches.length > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedBranches.length} Branch{selectedBranches.length !== 1 ? 'es' : ''} Selected
                </span>
                {filteredBranches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredBranches}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                  >
                    Select Filtered
                  </button>
                )}
                {selectedBranches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBranches}
                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Validation Message next to branch field */}
            {hasAttemptedSubmit && branchError && (
              <p className="mb-2.5 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{branchError}</span>
              </p>
            )}

            {/* Search Box */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                placeholder="Search branches (e.g. Computer, Information Technology, AI, Mechanical, Civil)..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {branchSearch && (
                <button
                  type="button"
                  onClick={() => setBranchSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selected Branch Badges */}
            {selectedBranches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedBranches.map((branch) => (
                  <span
                    key={branch}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    <span>{branch}</span>
                    <button
                      type="button"
                      onClick={() => handleBranchToggle(branch)}
                      className="hover:text-blue-900 cursor-pointer"
                      title={`Remove ${branch}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Branch Selection List */}
            <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {filteredBranches.map((branch) => {
                const isSelected = selectedBranches.includes(branch);
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => handleBranchToggle(branch)}
                    className={`px-3 py-2 text-left text-xs font-medium rounded-lg border transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="line-clamp-1">{branch}</span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 shrink-0 ml-1.5" />
                    ) : (
                      <span className="text-slate-400 text-[10px] shrink-0 ml-1.5">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Preferred Cities (OPTIONAL - if none selected, do not filter by city) */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Preferred Cities <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Optional. If none is selected, colleges from all cities across Maharashtra are shown.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedCities.length === 0
                    ? 'All Cities'
                    : `${selectedCities.length} Cit${selectedCities.length !== 1 ? 'ies' : 'y'} Selected`}
                </span>
                {selectedCities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCities([])}
                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                  >
                    Reset to All
                  </button>
                )}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Search cities (e.g. Pune, Mumbai, Nagpur, Nashik, Kolhapur, Amravati)..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {citySearch && (
                <button
                  type="button"
                  onClick={() => setCitySearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* City Selection Chips */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {filteredCities.map((city) => {
                const isSelected = selectedCities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCityToggle(city)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? `✓ ${city}` : `+ ${city}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button: Full Width at bottom of form, Bright Blue */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleFindColleges}
              disabled={loading}
              className="w-full relative group inline-flex items-center justify-center gap-2.5 px-6 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.99] rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
                  <span className="tracking-wide">Finding colleges for you…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                  <span className="tracking-wide">Find Colleges</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div ref={resultsRef} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                College List
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {hasSearched
                  ? `Found ${predictions.length} matching college recommendations classified by chance ranges.`
                  : 'Fill in your profile details above and click Find Colleges to explore recommendations.'}
              </p>
            </div>

            {/* Exactly Three Download Buttons side by side on desktop and stacked on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
              {/* 1. ⬇ Best Match List (PDF) */}
              <button
                type="button"
                onClick={handleDownloadBestMatchPdf}
                disabled={pdfGeneratingType !== null || predictions.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download 10:10:10 best match list with summary analysis"
              >
                {pdfGeneratingType === 'best_match' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>⬇ Best Match List (PDF)</span>
                  </>
                )}
              </button>

              {/* 2. ⬇ My City Options (PDF) */}
              <button
                type="button"
                onClick={handleDownloadMyCityOptionsPdf}
                disabled={pdfGeneratingType !== null}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download options PDF for cutoffs >= student percentage"
              >
                {pdfGeneratingType === 'city_options' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>⬇ My City Options (PDF)</span>
                  </>
                )}
              </button>

              {/* 3. ⬇ CAP Round Option List (PDF) */}
              <button
                type="button"
                onClick={handleDownloadCapRoundOptionListPdf}
                disabled={pdfGeneratingType !== null || predictions.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download all realistic college options (cutoff <= P + 6) ranked by preference"
              >
                {pdfGeneratingType === 'cap_round' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>⬇ CAP Round Option List (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chance Ranges Table for Student's Actual Percentage */}
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Chance Category Cutoff Ranges for Your Percentage (P = {percentage.toFixed(2)}%)
              </span>
              <span className="text-xs text-slate-500">
                Classified by Latest Cutoff
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 min-w-[500px]">
                <thead className="bg-slate-100/80 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Chance Category</th>
                    <th scope="col" className="px-4 py-2.5">Cutoff Range</th>
                    <th scope="col" className="px-4 py-2.5 text-slate-500">Example for 75%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-emerald-800 flex items-center gap-1.5">
                      <span>🟢</span>
                      <span>Good Chance</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {(percentage - 4).toFixed(2)}% to {percentage.toFixed(2)}% (under {percentage.toFixed(2)}%)
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      71% to under 75%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-blue-800 flex items-center gap-1.5">
                      <span>🔵</span>
                      <span>Moderate Chance</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {percentage.toFixed(2)}% to {(percentage + 2).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      75% to 77%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-amber-800 flex items-center gap-1.5">
                      <span>🟡</span>
                      <span>Borderline</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      above {(percentage + 2).toFixed(2)}% to {(percentage + 6).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      above 77% to 81%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grouping Filter Tabs with Counts */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveGroupFilter('ALL')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeGroupFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Groups ({predictions.length})
            </button>

            {/* Good Chance: Green */}
            <button
              type="button"
              onClick={() => setActiveGroupFilter('Good Chance')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeGroupFilter === 'Good Chance'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
              }`}
            >
              <span>🟢</span>
              <span>Good Chance ({goodChanceColleges.length})</span>
            </button>

            {/* Moderate Chance: Blue */}
            <button
              type="button"
              onClick={() => setActiveGroupFilter('Moderate Chance')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeGroupFilter === 'Moderate Chance'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/70'
              }`}
            >
              <span>🔵</span>
              <span>Moderate Chance ({moderateChanceColleges.length})</span>
            </button>

            {/* Borderline: Amber */}
            <button
              type="button"
              onClick={() => setActiveGroupFilter('Borderline')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeGroupFilter === 'Borderline'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              <span>🟡</span>
              <span>Borderline ({borderlineColleges.length})</span>
            </button>
          </div>

          {/* Results: Three Group Cards with badges and individual tables */}
          <div className="mt-6">
            {loading ? (
              <div className="text-center py-16 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-800">Finding colleges for you…</p>
                <p className="text-xs text-slate-400 mt-1">Analyzing Maharashtra CET Cell CAP records</p>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-base font-semibold text-slate-700">Enter your details and click Find Colleges</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Select your branches, enter your percentage, and click the blue Find Colleges button above.
                </p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-12 text-amber-900 bg-amber-50/70 rounded-xl border border-dashed border-amber-300">
                <Building className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-base font-semibold text-amber-900">No colleges found matching criteria</p>
                <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                  Try selecting additional branches, cities, or adjusting your preferences above.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Good Chance Group Card */}
                {(activeGroupFilter === 'ALL' || activeGroupFilter === 'Good Chance') && (
                  <div className="rounded-2xl border border-emerald-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-4 border-b border-emerald-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🟢</span>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            Good Chance Colleges
                          </h3>
                          <p className="text-xs text-slate-500">
                            Cutoff Range: {(percentage - 4).toFixed(2)}% to under {percentage.toFixed(2)}% (P − 4 to under P)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {goodChanceColleges.length} Colleges
                        </span>
                      </div>
                    </div>
                    {renderCollegeTable(
                      goodChanceColleges,
                      'No colleges found in Good Chance range for this profile.'
                    )}
                  </div>
                )}

                {/* 2. Moderate Chance Group Card */}
                {(activeGroupFilter === 'ALL' || activeGroupFilter === 'Moderate Chance') && (
                  <div className="rounded-2xl border border-blue-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-4 border-b border-blue-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🔵</span>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            Moderate Chance Colleges
                          </h3>
                          <p className="text-xs text-slate-500">
                            Cutoff Range: {percentage.toFixed(2)}% to {(percentage + 2).toFixed(2)}% (P to P + 2)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          {moderateChanceColleges.length} Colleges
                        </span>
                      </div>
                    </div>
                    {renderCollegeTable(
                      moderateChanceColleges,
                      'No colleges found in Moderate Chance range for this profile.'
                    )}
                  </div>
                )}

                {/* 3. Borderline Group Card */}
                {(activeGroupFilter === 'ALL' || activeGroupFilter === 'Borderline') && (
                  <div className="rounded-2xl border border-amber-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-4 border-b border-amber-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🟡</span>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            Borderline Colleges
                          </h3>
                          <p className="text-xs text-slate-500">
                            Cutoff Range: above {(percentage + 2).toFixed(2)}% to {(percentage + 6).toFixed(2)}% (above P + 2 to P + 6)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {borderlineColleges.length} Colleges
                        </span>
                      </div>
                    </div>
                    {renderCollegeTable(
                      borderlineColleges,
                      'No colleges found in Borderline range for this profile.'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-600">Disclaimer:</span> Cutoffs and estimates are indicative based on previous year CAP rounds. Actual cutoffs may vary in the current academic year according to merit rankings, seat matrix updates, and applicant preferences. Please consult official DTE Maharashtra / State CET Cell notifications for final admission decisions.
            </p>
          </div>
        </div>
      </main>

      {/* Deep Navy Footer */}
      <footer className="mt-8 bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="leading-relaxed">
            Maharashtra DSE College Finder · Developed by Shubham Ganesh Jivane · Data: Maharashtra CET Cell CAP cutoff records · For guidance only.
          </p>
        </div>
      </footer>
    </div>
  );
};
