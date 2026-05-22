import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommitBarChart from '../components/charts/CommitBarChart';

// Mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock ResponsiveContainer from Recharts
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe('CommitBarChart Component', () => {
  const sampleData = [
    { date: '2026-05-20', count: 5 },
    { date: '2026-05-21', count: 12 },
    { date: '2026-05-22', count: 8 },
  ];

  it('renders with valid data and displays title', () => {
    render(<CommitBarChart data={sampleData} title="Commit Count" />);
    
    // Check title
    expect(screen.getByText('Commit Count')).toBeTruthy();
    
    // Check if the container is present
    const container = screen.getByText('Commit Count').closest('div');
    expect(container).toBeTruthy();
  });

  it('shows empty state when data is empty', () => {
    render(<CommitBarChart data={[]} title="Commit Count" />);
    
    expect(screen.getByText('Commit Count')).toBeTruthy();
    expect(screen.getByText('No commit data available')).toBeTruthy();
  });
});
