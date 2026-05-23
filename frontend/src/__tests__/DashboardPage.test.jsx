import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import useRepoStore from '../store/repoStore';

// Mock hooks
vi.mock('../hooks/useAuth', () => ({
  default: () => ({
    user: { name: 'Pravin' }
  })
}));

vi.mock('../hooks/useAnalytics', () => ({
  default: () => ({
    velocity: {},
    commitChart: [],
    commits: [],
    fetchVelocity: vi.fn(),
    fetchCommitChart: vi.fn(),
    fetchCommits: vi.fn()
  })
}));

// Mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe('DashboardPage Component', () => {
  beforeEach(() => {
    useRepoStore.setState({
      selectedRepo: null,
      isConnected: true,
      statusLoading: false
    });
  });

  it('shows empty state when no repo is selected', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome back, Pravin!/i)).toBeTruthy();
    expect(screen.getByText(/No Repository Selected/i)).toBeTruthy();
    expect(screen.getByText(/Choose a repository from the selector dropdown/i)).toBeTruthy();
  });
});
