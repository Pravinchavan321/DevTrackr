import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from '../components/dashboard/StatsCard';

describe('StatsCard Component', () => {
  it('renders label and value', () => {
    render(<StatsCard label="Total Commits" value="150" />);
    
    expect(screen.getByText('Total Commits')).toBeTruthy();
    expect(screen.getByText('150')).toBeTruthy();
  });
});
