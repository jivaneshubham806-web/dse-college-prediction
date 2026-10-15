/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActiveSection } from './types/index.ts';
import { CollegePredictionSection } from './components/CollegePredictionSection.tsx';
import { CollegeCutoffExplorerSection } from './components/CollegeCutoffExplorerSection.tsx';
import { Database, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');

  if (activeSection === 'prediction') {
    return (
      <CollegePredictionSection onBackToHome={() => setActiveSection('home')} />
    );
  }

  if (activeSection === 'explorer') {
    return (
      <CollegeCutoffExplorerSection onBackToHome={() => setActiveSection('home')} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* Deep Navy Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none" aria-hidden="true">🏛️</span>
            <div>
              <span className="font-bold text-white text-base sm:text-lg tracking-tight">
                Maharashtra DSE College Finder
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-medium">
                Direct Second Year Engineering Admissions
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium hidden md:block">
            Official CAP Cutoff Database
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        {/* Title, Developer Credit, and Description */}
        <section className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Maharashtra DSE College Finder
          </h1>
          <p className="mt-2.5 text-base sm:text-lg font-semibold text-blue-600">
            Developed by Shubham Ganesh Jivane
          </p>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            This website helps DSE students in Maharashtra find colleges that match their diploma percentage, branch, category, and cities, using Maharashtra CET Cell CAP cutoff records. You can also look up the cutoffs of any college.
          </p>
        </section>

        {/* Two Cards with gradient styling: side by side on desktop and stacked on mobile */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch mb-10 sm:mb-12">
          {/* Card 1: Find My Colleges (Blue-to-Purple Gradient) */}
          <div
            onClick={() => setActiveSection('prediction')}
            className="group relative flex flex-col justify-between p-7 sm:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
          >
            <div>
              <div className="text-4xl sm:text-5xl mb-4 select-none drop-shadow-sm" aria-hidden="true">
                🎯
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-blue-100 transition-colors">
                Find My Colleges
              </h2>
              <p className="mt-3 text-sm sm:text-base text-blue-50 leading-relaxed">
                Find suitable colleges based on your diploma percentage, branch, category, and cities.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-100 tracking-wide">
                Explore Cutoff Matches
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('prediction');
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-blue-900 bg-white hover:bg-blue-50 active:bg-blue-100 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Open</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: College Cutoff Explorer (Teal-to-Blue Gradient) */}
          <div
            onClick={() => setActiveSection('explorer')}
            className="group relative flex flex-col justify-between p-7 sm:p-8 bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800 text-white rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
          >
            <div>
              <div className="text-4xl sm:text-5xl mb-4 select-none drop-shadow-sm" aria-hidden="true">
                🎓
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-teal-100 transition-colors">
                College Cutoff Explorer
              </h2>
              <p className="mt-3 text-sm sm:text-base text-teal-50 leading-relaxed">
                Look up CAP 1, CAP 2, and CAP 3 cutoffs for any college by name or code.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-100 tracking-wide">
                View 363 Colleges
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('explorer');
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-teal-900 bg-white hover:bg-teal-50 active:bg-teal-100 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Open</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* About the data block */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-2.5 mb-4 text-slate-900">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">About the data</h3>
          </div>
          <ul className="space-y-2.5 text-sm sm:text-base text-slate-700">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              <span>Based on Maharashtra CET Cell CAP cutoff records for 2026-27.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              <span>Covers 363 Maharashtra DSE engineering colleges and 20,174 branch and category records.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              <span>Cutoff values shown are the original values from the dataset. Nothing is invented or estimated by hand.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              <span>Suggested colleges are estimates based on cutoffs. They are a guide, not a guarantee.</span>
            </li>
          </ul>
        </section>

        {/* Note block */}
        <section className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 sm:p-6 text-amber-900 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm sm:text-base font-medium leading-relaxed">
            <span className="font-bold text-amber-950">Note: </span>
            No tool can guarantee admission. Confirm your options with official Maharashtra CET Cell notifications and your counselling centre before you choose.
          </div>
        </section>
      </main>

      {/* Deep Navy Footer */}
      <footer className="mt-12 bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="leading-relaxed">
            Maharashtra DSE College Finder · Developed by Shubham Ganesh Jivane · Data: Maharashtra CET Cell CAP cutoff records · For guidance only.
          </p>
        </div>
      </footer>
    </div>
  );
}
