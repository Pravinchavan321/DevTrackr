import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../components/layout/PrivateRoute';
import useAuth from '../hooks/useAuth';

// Mock the hook
vi.mock('../hooks/useAuth', () => ({
  default: vi.fn()
}));

describe('PrivateRoute Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('redirects unauthenticated user to /login', async () => {
    // Mock unauthenticated state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loadUser: vi.fn().mockResolvedValue(null)
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Dashboard Content')).toBeNull();
    expect(await screen.findByText('Login Page')).toBeTruthy();
  });

  it('renders content for authenticated user', async () => {
    // Mock authenticated state
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loadUser: vi.fn().mockResolvedValue(null)
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Dashboard Content')).toBeTruthy();
    expect(screen.queryByText('Login Page')).toBeNull();
  });
});
