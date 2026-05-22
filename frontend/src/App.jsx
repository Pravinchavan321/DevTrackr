import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ToastNotifications from './components/common/ToastNotifications';

// Layout shells
import PrivateRoute from './components/layout/PrivateRoute';
import AppLayout from './components/layout/AppLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Protected Pages
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';

// Lightweight placeholders
import CommitsPage from './pages/CommitsPage';
import PullRequestsPage from './pages/PullRequestsPage';
import IssuesPage from './pages/IssuesPage';
import ContributorsPage from './pages/ContributorsPage';
import InsightsPage from './pages/InsightsPage';

import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      {/* Toast Alert Portal */}
      <ToastNotifications />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes Inside AppLayout Shell */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/commits" element={<CommitsPage />} />
            <Route path="/pullrequests" element={<PullRequestsPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/contributors" element={<ContributorsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Catch-all Fallback Redirect to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
