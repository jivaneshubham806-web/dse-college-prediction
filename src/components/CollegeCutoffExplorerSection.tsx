/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, Check, Building, Loader2, MapPin, Layers } from 'lucide-react';
import {
  loadCutoffExplorerData,
  ExplorerCutoffRecord,
  InstituteOption,
} from '../services/dataService.ts';
import { getCollegeLocation } from '../data/masterCollegeLocations.ts';

interface CollegeCutoffExplorerSectionProps {
  onBackToHome: () => void;
}

export const CollegeCutoffExplorerSection: React.FC<CollegeCutoffExplorerSectionProps> = ({
  onBackToHome,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [institutes, setInstitutes] = useState<InstituteOption[]>([]);
  const [allRecords, setAllRecords] = useState<ExplorerCutoffRecord[]>([]);

  // Search input & selected college (opens with NO college selected)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCollege, setSelectedCollege] = useState<InstituteOption | null>(null);

  // Dropdown states for the selected college
  const [selectedBranch, setSelectedBranch] = useState<string>('All Branches');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  // Load cutoff explorer data on mount
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { institutes: instList, records } = await loadCutoffExplorerData();
        if (mounted) {
          setInstitutes(instList);
          setAllRecords(records);
          // Opens with NO college selected as required
          setSelectedCollege(null);
        }
      } catch (err) {
        console.error('Error loading cutoff explorer data:', err);
        if (mounted) {
          setError('Failed to load cutoff data. Please ensure the data file is present.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter institutes based on search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return institutes.filter((inst) => {
      const codeMatches = inst.code.toLowerCase().includes(q);
      const nameMatches = inst.name.toLowerCase().includes(q);
      return codeMatches || nameMatches;
    });
  }, [institutes, searchQuery]);

  // College-specific cutoff records
  const collegeRecords = useMemo(() => {
    if (!selectedCollege) return [];
    return allRecords.filter((r) => r.instituteCode === selectedCollege.code);
  }, [allRecords, selectedCollege]);

  // Verified City & District lookup by Institute_Code
  const { verifiedCity, verifiedDistrict } = useMemo(() => {
    if (!selectedCollege) {
      return { verifiedCity: 'Not verified', verifiedDistrict: 'Not verified' };
    }

    const loc = getCollegeLocation(selectedCollege.code);

    if (loc) {
      return {
        verifiedCity: loc.city || 'Not verified',
        verifiedDistrict: loc.district || 'Not verified',
      };
    }

    return {
      verifiedCity: 'Not verified',
      verifiedDistrict: 'Not verified',
    };
  }, [selectedCollege]);

  // Available Branches for selected college
  const availableBranches = useMemo(() => {
    const branches = Array.from(
      new Set(collegeRecords.map((r) => r.department).filter(Boolean))
    );
    return branches.sort((a, b) => a.localeCompare(b));
  }, [collegeRecords]);

  // Available Categories for selected college
  const availableCategories = useMemo(() => {
    const categories = Array.from(
      new Set(collegeRecords.map((r) => r.category).filter(Boolean))
    );
    return categories.sort((a, b) => a.localeCompare(b));
  }, [collegeRecords]);

  // Reset dropdown filters when selected college changes
  useEffect(() => {
    setSelectedBranch('All Branches');
    setSelectedCategory('All Categories');
  }, [selectedCollege]);

  // Filter and sort cutoff rows: Sort by Branch, then Category
  const displayedRows = useMemo(() => {
    const filtered = collegeRecords.filter((r) => {
      const matchBranch = selectedBranch === 'All Branches' || r.department === selectedBranch;
      const matchCat = selectedCategory === 'All Categories' || r.category === selectedCategory;
      return matchBranch && matchCat;
    });

    return [...filtered].sort((a, b) => {
      const cmpBranch = a.department.localeCompare(b.department);
      if (cmpBranch !== 0) return cmpBranch;
      return a.category.localeCompare(b.category);
    });
  }, [collegeRecords, selectedBranch, selectedCategory]);

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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-900/60 text-teal-200 border border-teal-700/60">
            Cutoff Explorer
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Title Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl text-3xl select-none" aria-hidden="true">
              🎓
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                College Cutoff Explorer
              </h1>
              <p className="mt-2 text-slate-600 leading-relaxed max-w-3xl text-sm sm:text-base">
                Search any of the 363 Maharashtra engineering institutes to explore branch-wise and category-wise CAP round cutoffs.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">Loading Cutoff Database...</p>
            <p className="text-xs text-slate-400 mt-1">Reading all 20,174 records across 363 colleges</p>
          </div>
        ) : (
          <>
            {/* SEARCH BOX SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span>Search College</span>
                </h2>
                {selectedCollege && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollege(null);
                      setSearchQuery('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Select Another College
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                Search by College Code (e.g. 1002, 3012, 6006) or part of the name (e.g. COEP, VJTI, SPCE, PICT).
              </p>

              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type college code or name to search..."
                  className="w-full pl-10 pr-9 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Show matches when student searches */}
              {searchQuery.trim().length > 0 && (
                <div className="mt-3 border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white shadow-xs">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-amber-700 bg-amber-50/50">
                      No colleges match &quot;{searchQuery}&quot;. Please check the code or spelling.
                    </div>
                  ) : (
                    searchResults.map((inst) => {
                      const isSelected = selectedCollege?.code === inst.code;
                      return (
                        <button
                          key={inst.code}
                          type="button"
                          onClick={() => {
                            setSelectedCollege(inst);
                            setSearchQuery('');
                          }}
                          className={`w-full px-4 py-3 text-left text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-medium'
                              : 'hover:bg-blue-50/60 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span
                              className={`font-mono text-xs px-2.5 py-1 rounded font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-blue-700 text-blue-100'
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {inst.code}
                            </span>
                            <span className="truncate">{inst.name}</span>
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 shrink-0 text-white" />
                          ) : (
                            <span className="text-xs text-blue-600 font-semibold shrink-0">Select →</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* DETAILS CARD AFTER SELECTION */}
            {selectedCollege && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Building className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                      <div>
                        <div className="inline-block font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 mb-1.5 border border-blue-200">
                          Code: {selectedCollege.code}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                          {selectedCollege.name}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Details row: College Code, Full College Name, Verified City, Verified District, and Number of Branches */}
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-slate-700">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">College Code</span>
                      <span className="font-mono font-bold text-slate-900 text-base">{selectedCollege.code}</span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Verified City</span>
                      <span
                        className={
                          verifiedCity === 'Not verified'
                            ? 'text-slate-400 italic text-sm'
                            : 'font-semibold text-slate-900 text-sm'
                        }
                      >
                        {verifiedCity}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Verified District</span>
                      <span
                        className={
                          verifiedDistrict === 'Not verified'
                            ? 'text-slate-400 italic text-sm'
                            : 'font-semibold text-slate-900 text-sm'
                        }
                      >
                        {verifiedDistrict}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Total Branches</span>
                      <span className="font-bold text-blue-600 text-sm">
                        {availableBranches.length} Branch{availableBranches.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Two Dropdowns: Branch and Category */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Branch Dropdown */}
                    <div>
                      <label htmlFor="branch-select" className="block text-sm font-medium text-slate-700 mb-1">
                        Branch
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Filter cutoffs by specific department.</p>
                      <select
                        id="branch-select"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        <option value="All Branches">All Branches</option>
                        {availableBranches.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label htmlFor="category-select" className="block text-sm font-medium text-slate-700 mb-1">
                        Category
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Filter cutoffs by candidate seat category.</p>
                      <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        <option value="All Categories">All Categories</option>
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cutoff Table: Branch | Category | CAP 1 | CAP 2 | CAP 3 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Cutoff Records ({displayedRows.length})
                    </h3>
                    <div className="text-xs text-slate-500 font-medium">
                      Showing original CAP values (sorted by Branch, then Category)
                    </div>
                  </div>

                  {displayedRows.length === 0 ? (
                    <div className="text-center py-12 text-amber-800 bg-amber-50/70 rounded-xl border border-dashed border-amber-300 text-sm">
                      No cutoff records found matching the selected branch and category.
                    </div>
                  ) : (
                    /* Horizontal scrolling on mobile inside its own container */
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm text-slate-700 min-w-[600px]">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th scope="col" className="px-4 py-3.5">
                              Branch
                            </th>
                            <th scope="col" className="px-4 py-3.5">
                              Category
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-right font-mono">
                              CAP 1
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-right font-mono">
                              CAP 2
                            </th>
                            <th scope="col" className="px-4 py-3.5 text-right font-mono">
                              CAP 3
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {displayedRows.map((row, idx) => (
                            <tr
                              key={`${row.instituteCode}-${row.department}-${row.category}-${idx}`}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-3.5 font-medium text-slate-900">
                                {row.department || '—'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {row.category || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                                {row.cap1 ? row.cap1 : '—'}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                                {row.cap2 ? row.cap2 : '—'}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                                {row.cap3 ? row.cap3 : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Deep Navy Footer on every screen */}
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
