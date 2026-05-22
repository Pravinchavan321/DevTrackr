import React from 'react';
import { Link } from 'react-router-dom';
import {
  CodeBracketIcon,
  LightBulbIcon,
  ExclamationCircleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const features = [
    {
      name: 'GitHub Analytics Integration',
      description: 'Automatically pull paginated commits, open/closed issues, and PR histories with incremental data sync pipelines.',
      icon: CodeBracketIcon
    },
    {
      name: 'AI Sprint Summaries',
      description: 'Generates detailed developer velocity logs and sprint progress reports using Google Gemini-1.5-Flash.',
      icon: LightBulbIcon
    },
    {
      name: 'Bottleneck Detection',
      description: 'Isolate stale pull requests, high merge latency, and irregular development velocities before they impact deadlines.',
      icon: ExclamationCircleIcon
    },
    {
      name: 'Professional PDF Reports',
      description: 'Compile high-quality repository health assessments and contributor summaries to share with key stakeholders instantly.',
      icon: DocumentArrowDownIcon
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.3)_0%,rgba(0,0,0,0)_70%)] z-0"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-900 bg-gray-950/40 backdrop-blur-md sticky top-0 px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
            <svg
              className="h-5.5 w-5.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">DevTrackr</span>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-gray-300 hover:text-white px-3.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg border border-transparent shadow-sm hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center space-y-12">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-3 py-1 text-xs font-semibold text-indigo-400">
            <span>Powered by Google Gemini AI</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl font-sans">
            AI-Driven Developer <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
              Productivity Intelligence
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Gain immediate insights into commits, pull requests, issues, and contributor velocities with premium dashboard charts and cached LLM recommendations.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-md">
          <Link
            to="/register"
            className="w-full sm:w-auto text-center font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl border border-transparent shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Create Free Account
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto text-center font-semibold bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 hover:border-gray-700/80 px-8 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Demo Sign In
          </Link>
        </div>

        {/* Features Grid */}
        <div className="w-full pt-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-gray-900/60 border border-gray-850/80 hover:border-gray-800/80 rounded-2xl p-6 text-left space-y-4 hover:bg-gray-900 transition-all duration-200 group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-850 border border-gray-800 text-gray-400 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 group-hover:border-indigo-500/10 transition-all duration-200 shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-gray-100 tracking-tight group-hover:text-white transition-colors">
                      {feature.name}
                    </h3>
                    <p className="text-xs text-gray-405 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-900/80 py-8 text-center text-xs text-gray-500 font-mono">
        <p>&copy; {new Date().getFullYear()} DevTrackr Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
