import React, { useEffect } from 'react';
import useGithub from '../../hooks/useGithub';

export default function RepoSelector() {
  const {
    repos,
    selectedRepo,
    isConnected,
    reposLoading,
    fetchRepos,
    setSelectedRepo
  } = useGithub();

  // Fetch repositories on mount if connected and empty
  useEffect(() => {
    if (isConnected && repos.length === 0) {
      fetchRepos();
    }
  }, [isConnected, repos.length, fetchRepos]);

  if (!isConnected) {
    return null;
  }

  const handleChange = (e) => {
    const selectedFullName = e.target.value;
    const repo = repos.find((r) => r.fullName === selectedFullName);
    setSelectedRepo(repo || null);
  };

  return (
    <div className="flex flex-col">
      {reposLoading ? (
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400">
          <svg className="animate-spin h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Loading repos...</span>
        </div>
      ) : (
        <select
          value={selectedRepo?.fullName || ''}
          onChange={handleChange}
          disabled={repos.length === 0}
          className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700/80 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="" disabled>
            {repos.length === 0 ? 'No repositories found' : 'Select active repository'}
          </option>
          {repos.map((repo) => (
            <option key={repo._id || repo.id || repo.fullName} value={repo.fullName}>
              {repo.fullName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
