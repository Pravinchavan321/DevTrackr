import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Import components to test
import InsightCard from '../components/insights/InsightCard';
import SprintSummaryCard from '../components/insights/SprintSummaryCard';
import RecommendationsCard from '../components/insights/RecommendationsCard';
import GenerateInsightButton from '../components/insights/GenerateInsightButton';
import InsightsPage from '../pages/InsightsPage';

// Mock Zustand stores and custom hooks
vi.mock('../store/repoStore', () => {
  return {
    default: vi.fn((selector) => {
      // Return null selectedRepo by default for empty state test
      return selector({ selectedRepo: null });
    })
  };
});

vi.mock('../hooks/useInsights', () => {
  return {
    default: () => ({
      loading: false,
      cachedInsights: {
        sprint_summary: null,
        bottleneck: null,
        contributor_analysis: null,
        recommendations: null
      },
      error: null,
      generating: {
        sprint_summary: false,
        bottleneck: false,
        contributor_analysis: false,
        recommendations: false
      },
      fetchInsights: vi.fn(),
      generateSprintSummary: vi.fn(),
      generateBottlenecks: vi.fn(),
      generateContributorAnalysis: vi.fn(),
      generateRecommendations: vi.fn(),
      downloadPdfReport: vi.fn()
    })
  };
});

describe('AI Insights components', () => {
  
  // 1. InsightCard renders title and content
  describe('InsightCard Component', () => {
    it('renders title and children content correctly', () => {
      render(
        <InsightCard title="Sprint Overview" description="Sprint health details">
          <div data-testid="insight-content">Active sprint data</div>
        </InsightCard>
      );
      
      expect(screen.getByText('Sprint Overview')).toBeTruthy();
      expect(screen.getByText('Sprint health details')).toBeTruthy();
      expect(screen.getByTestId('insight-content').textContent).toBe('Active sprint data');
    });

    // 2. InsightCard shows loading state
    it('shows skeleton loaders during loading state', () => {
      const { container } = render(
        <InsightCard title="Sprint Overview" loading={true}>
          <div>Active sprint data</div>
        </InsightCard>
      );
      
      // Check that it renders skeleton lines and animate-pulse elements
      expect(container.querySelector('.animate-pulse')).toBeTruthy();
      expect(screen.queryByText('Active sprint data')).toBeNull();
    });
  });

  // 3. SprintSummaryCard renders summary and score
  describe('SprintSummaryCard Component', () => {
    it('renders velocity details, summaries and score progress ring correctly', () => {
      const mockData = {
        summary: 'Excellent sprint with fast turnaround times and high commits count.',
        velocity: 'High with steady pace',
        highlights: ['Shipped OAuth connect flow', 'Resolved JWT race condition'],
        concerns: ['High database latency on aggregates'],
        sprintScore: 9
      };
      
      render(<SprintSummaryCard parsedData={mockData} onGenerate={() => {}} />);
      
      // Score and Velocity
      expect(screen.getByText('9')).toBeTruthy();
      expect(screen.getByText('High')).toBeTruthy();
      expect(screen.getByText('Sprint Health Score')).toBeTruthy();
      
      // Highlights & concerns lists
      expect(screen.getByText('Shipped OAuth connect flow')).toBeTruthy();
      expect(screen.getByText('Resolved JWT race condition')).toBeTruthy();
      expect(screen.getByText('High database latency on aggregates')).toBeTruthy();
    });
  });

  // 4. RecommendationsCard renders recommendations
  describe('RecommendationsCard Component', () => {
    it('renders next best action and priority recommendations correctly', () => {
      const mockData = {
        nextBestAction: 'Focus on merging open PR #14 immediately to relieve database stress.',
        recommendations: [
          {
            priority: 'high',
            title: 'Optimize MongoDB indexing for queries',
            reason: 'Queries on logs are exceeding 500ms bounds.',
            action: 'Add compounding index to sha and repoId keys.'
          },
          {
            priority: 'medium',
            title: 'Remove unused dev dependencies',
            reason: 'Production bundle sizes are near 4.5MB threshold.',
            action: 'Delete mock configurations.'
          }
        ]
      };
      
      render(<RecommendationsCard parsedData={mockData} />);
      
      // Next best action header and content
      expect(screen.getByText('Focus on merging open PR #14 immediately to relieve database stress.')).toBeTruthy();
      
      // List entries
      expect(screen.getByText('Optimize MongoDB indexing for queries')).toBeTruthy();
      expect(screen.getByText('Remove unused dev dependencies')).toBeTruthy();
      expect(screen.getByText('Add compounding index to sha and repoId keys.')).toBeTruthy();
      expect(screen.getByText('High')).toBeTruthy();
      expect(screen.getByText('Med')).toBeTruthy();
    });
  });

  // 5. GenerateInsightButton disables during loading
  describe('GenerateInsightButton Component', () => {
    it('disables mouse clicks and shows loading spinner when loading=true', () => {
      const handleClick = vi.fn();
      render(
        <GenerateInsightButton onClick={handleClick} loading={true}>
          Generate Summary
        </GenerateInsightButton>
      );
      
      const btn = screen.getByRole('button');
      expect(btn.hasAttribute('disabled')).toBe(true);
      expect(btn.getAttribute('aria-busy')).toBe('true');
      
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // 6. Optional: InsightsPage shows empty state when no selectedRepo
  describe('InsightsPage Component', () => {
    it('displays the empty select state when selectedRepo is null', () => {
      render(<InsightsPage />);
      
      expect(screen.getByText('Select a repository')).toBeTruthy();
      expect(screen.getByText('Choose a synced repository to generate AI insights.')).toBeTruthy();
    });
  });

});
