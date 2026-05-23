import React, { useEffect, useState } from 'react';
import useRepoStore from '../store/repoStore';
import useInsights from '../hooks/useInsights';
import { timeAgo } from '../utils/dateHelpers';
import EmptyState from '../components/common/EmptyState';
import GenerateInsightButton from '../components/insights/GenerateInsightButton';
import InsightCard from '../components/insights/InsightCard';
import SprintSummaryCard from '../components/insights/SprintSummaryCard';
import BottleneckCard from '../components/insights/BottleneckCard';
import ContributorAnalysisCard from '../components/insights/ContributorAnalysisCard';
import RecommendationsCard from '../components/insights/RecommendationsCard';
import SyncButton from '../components/dashboard/SyncButton';

/**
 * InsightsPage connects the React frontend to Gemini AI Insights and PDFKit Export APIs.
 */
export default function InsightsPage() {
  const selectedRepo = useRepoStore((state) => state.selectedRepo);
  const [focusedInsight, setFocusedInsight] = useState(null);
  const {
    loading,
    cachedInsights,
    error,
    generating,
    fetchInsights,
    generateSprintSummary,
    generateBottlenecks,
    generateContributorAnalysis,
    generateRecommendations,
    downloadPdfReport
  } = useInsights();

  // Load cached insights when repository changes
  useEffect(() => {
    if (selectedRepo?._id) {
      fetchInsights(selectedRepo._id);
    }
  }, [selectedRepo?._id, fetchInsights]);

  useEffect(() => {
    if (!focusedInsight) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setFocusedInsight(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focusedInsight]);

  // Handler to stream PDF reports
  const handlePdfDownload = async () => {
    if (!selectedRepo?._id) return;
    await downloadPdfReport(selectedRepo._id, selectedRepo.name);
  };

  if (!selectedRepo) {
    return (
      <div className="py-10">
        <EmptyState
          title="Select a repository"
          description="Choose a synced repository to generate AI insights."
        />
      </div>
    );
  }

  if (selectedRepo && !selectedRepo._id) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Developer Insights</h1>
          <p className="text-sm text-gray-400">Sprint summaries, systemic bottlenecks, and contributor analysis.</p>
        </div>
        <EmptyState
          title="Sync Required"
          description="To generate AI insights with Gemini, we first need to import this repository's commits, issues, and pull requests."
          action={
            <div className="flex justify-center">
              <SyncButton />
            </div>
          }
        />
      </div>
    );
  }

  // Extract individual insight objects
  const summaryDoc = cachedInsights.sprint_summary;
  const bottleneckDoc = cachedInsights.bottleneck;
  const contributorDoc = cachedInsights.contributor_analysis;
  const recommendationsDoc = cachedInsights.recommendations;

  // Helper to render relative timestamps
  const renderTimestamp = (doc) => {
    if (!doc?.generatedAt) return null;
    return (
      <span className="text-[10px] text-gray-500 font-medium tracking-wide">
        Synced {timeAgo(doc.generatedAt)}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Developer Insights</h1>
            <span className="inline-flex items-center rounded bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20">
              Gemini Powered
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Sprint executive summaries, systemic pipeline bottlenecks, and priority contributor analysis for{' '}
            <strong className="text-violet-400">{selectedRepo.fullName}</strong>.
          </p>
        </div>
        
        {/* PDF Download Button */}
        <button
          onClick={handlePdfDownload}
          disabled={loading || Object.values(generating).some(Boolean)}
          className="inline-flex items-center justify-center font-medium bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg px-4 py-2 text-sm disabled:opacity-50 disabled:bg-gray-900 transition-all duration-200 shadow-sm shrink-0"
        >
          <svg className="h-4.5 w-4.5 mr-2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF Report
        </button>
      </div>

      {/* Global Error Callout */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-gray-200">Retrieval Impediment</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* High-Fidelity Responsive 2-Column Grid */}
      {focusedInsight && (
        <button
          type="button"
          className="insight-focus-backdrop"
          aria-label="Close focused insight"
          onClick={() => setFocusedInsight(null)}
        />
      )}

      <div className={`insights-focus-grid grid grid-cols-1 xl:grid-cols-2 gap-8 ${focusedInsight ? 'is-click-focused' : ''}`}>
        
        {/* Section 1: Sprint Summary */}
        <InsightCard
          type="sprint_summary"
          className="insight-focus-item"
          isFocused={focusedInsight === 'sprint_summary'}
          isAnyFocused={Boolean(focusedInsight)}
          onActivate={() => setFocusedInsight('sprint_summary')}
          onClose={() => setFocusedInsight(null)}
          title="Sprint Summary"
          description="Executive summary, velocity ratings, highlights and Concerns."
          loading={loading || (generating.sprint_summary && !summaryDoc)}
          error={null}
          action={
            <div className="flex items-center space-x-2">
              {summaryDoc && (
                <GenerateInsightButton
                  variant="ghost"
                  loading={generating.sprint_summary}
                  disabled={loading}
                  onClick={() => generateSprintSummary(selectedRepo._id, {}, { force: true })}
                  className="px-2 py-1 text-xs"
                >
                  Regenerate
                </GenerateInsightButton>
              )}
              {!summaryDoc && !generating.sprint_summary && (
                <GenerateInsightButton
                  variant="primary"
                  loading={generating.sprint_summary}
                  disabled={loading}
                  onClick={() => generateSprintSummary(selectedRepo._id, {}, {})}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500"
                >
                  Generate Summary
                </GenerateInsightButton>
              )}
            </div>
          }
          footer={renderTimestamp(summaryDoc)}
        >
          <SprintSummaryCard
            parsedData={summaryDoc?.parsedData}
            generating={generating.sprint_summary}
            onGenerate={(fromDate, toDate) => 
              generateSprintSummary(selectedRepo._id, { from: fromDate, to: toDate }, { force: true })
            }
          />
        </InsightCard>

        {/* Section 2: Bottleneck Detection */}
        <InsightCard
          type="bottleneck"
          className="insight-focus-item"
          isFocused={focusedInsight === 'bottleneck'}
          isAnyFocused={Boolean(focusedInsight)}
          onActivate={() => setFocusedInsight('bottleneck')}
          onClose={() => setFocusedInsight(null)}
          title="Bottleneck Analysis"
          description="Workload imbalances, average PR merge times, stale deliverables."
          loading={loading || (generating.bottleneck && !bottleneckDoc)}
          error={null}
          action={
            <div className="flex items-center space-x-2">
              {bottleneckDoc && (
                <GenerateInsightButton
                  variant="ghost"
                  loading={generating.bottleneck}
                  disabled={loading}
                  onClick={() => generateBottlenecks(selectedRepo._id, { force: true })}
                  className="px-2 py-1 text-xs"
                >
                  Regenerate
                </GenerateInsightButton>
              )}
              {!bottleneckDoc && !generating.bottleneck && (
                <GenerateInsightButton
                  variant="primary"
                  loading={generating.bottleneck}
                  disabled={loading}
                  onClick={() => generateBottlenecks(selectedRepo._id, {})}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500"
                >
                  Detect Bottlenecks
                </GenerateInsightButton>
              )}
            </div>
          }
          footer={renderTimestamp(bottleneckDoc)}
        >
          <BottleneckCard parsedData={bottleneckDoc?.parsedData} />
        </InsightCard>

        {/* Section 3: Contributor Health Analysis */}
        <InsightCard
          type="contributor"
          className="insight-focus-item"
          isFocused={focusedInsight === 'contributor'}
          isAnyFocused={Boolean(focusedInsight)}
          onActivate={() => setFocusedInsight('contributor')}
          onClose={() => setFocusedInsight(null)}
          title="Contributor Analysis"
          description="Collaboration score metrics, inactive handles, project dependencies."
          loading={loading || (generating.contributor_analysis && !contributorDoc)}
          error={null}
          action={
            <div className="flex items-center space-x-2">
              {contributorDoc && (
                <GenerateInsightButton
                  variant="ghost"
                  loading={generating.contributor_analysis}
                  disabled={loading}
                  onClick={() => generateContributorAnalysis(selectedRepo._id, { force: true })}
                  className="px-2 py-1 text-xs"
                >
                  Regenerate
                </GenerateInsightButton>
              )}
              {!contributorDoc && !generating.contributor_analysis && (
                <GenerateInsightButton
                  variant="primary"
                  loading={generating.contributor_analysis}
                  disabled={loading}
                  onClick={() => generateContributorAnalysis(selectedRepo._id, {})}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500"
                >
                  Analyze Contributor Health
                </GenerateInsightButton>
              )}
            </div>
          }
          footer={renderTimestamp(contributorDoc)}
        >
          <ContributorAnalysisCard parsedData={contributorDoc?.parsedData} />
        </InsightCard>

        {/* Section 4: Recommendations */}
        <InsightCard
          type="recommendations"
          className="insight-focus-item"
          isFocused={focusedInsight === 'recommendations'}
          isAnyFocused={Boolean(focusedInsight)}
          onActivate={() => setFocusedInsight('recommendations')}
          onClose={() => setFocusedInsight(null)}
          title="Recommendations"
          description="Prioritized actionable milestones to accelerate delivery speeds."
          loading={loading || (generating.recommendations && !recommendationsDoc)}
          error={null}
          action={
            <div className="flex items-center space-x-2">
              {recommendationsDoc && (
                <GenerateInsightButton
                  variant="ghost"
                  loading={generating.recommendations}
                  disabled={loading}
                  onClick={() => generateRecommendations(selectedRepo._id, { force: true })}
                  className="px-2 py-1 text-xs"
                >
                  Regenerate
                </GenerateInsightButton>
              )}
              {!recommendationsDoc && !generating.recommendations && (
                <GenerateInsightButton
                  variant="primary"
                  loading={generating.recommendations}
                  disabled={loading}
                  onClick={() => generateRecommendations(selectedRepo._id, {})}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500"
                >
                  Formulate Recommendations
                </GenerateInsightButton>
              )}
            </div>
          }
          footer={renderTimestamp(recommendationsDoc)}
        >
          <RecommendationsCard parsedData={recommendationsDoc?.parsedData} />
        </InsightCard>

      </div>
    </div>
  );
}
