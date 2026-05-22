/**
 * Maps raw GitHub API repository response to local database schema format.
 */
export const mapRepository = (githubRepo, userId) => {
  return {
    userId,
    githubRepoId: githubRepo.id,
    name: githubRepo.name,
    fullName: githubRepo.full_name,
    description: githubRepo.description || '',
    isPrivate: githubRepo.private || false,
    defaultBranch: githubRepo.default_branch || 'main',
    language: githubRepo.language || null,
    stars: githubRepo.stargazers_count || 0,
    forks: githubRepo.forks_count || 0,
    openIssuesCount: githubRepo.open_issues_count || 0,
    htmlUrl: githubRepo.html_url || ''
  };
};

/**
 * Maps raw GitHub API commit response to local database schema format.
 */
export const mapCommit = (githubCommit, repoId, commitDetails = null) => {
  const stats = commitDetails?.stats || githubCommit.stats;
  const files = commitDetails?.files || githubCommit.files;

  return {
    repoId,
    sha: githubCommit.sha,
    message: githubCommit.commit?.message || '',
    author: {
      name: githubCommit.commit?.author?.name || '',
      email: githubCommit.commit?.author?.email || '',
      login: githubCommit.author?.login || '',
      avatarUrl: githubCommit.author?.avatar_url || ''
    },
    additions: stats?.additions || 0,
    deletions: stats?.deletions || 0,
    filesChanged: files?.length || 0,
    committedAt: githubCommit.commit?.author?.date ? new Date(githubCommit.commit.author.date) : new Date(),
    url: githubCommit.html_url || ''
  };
};

/**
 * Maps raw GitHub API pull request response to local database schema format.
 */
export const mapPullRequest = (githubPr, repoId) => {
  return {
    repoId,
    number: githubPr.number,
    title: githubPr.title || '',
    body: githubPr.body || '',
    state: githubPr.state || 'open',
    author: {
      login: githubPr.user?.login || '',
      avatarUrl: githubPr.user?.avatar_url || '',
      htmlUrl: githubPr.user?.html_url || ''
    },
    reviewers: githubPr.requested_reviewers?.map((r) => ({
      login: r.login,
      avatarUrl: r.avatar_url
    })) || [],
    labels: githubPr.labels?.map((l) => (typeof l === 'string' ? l : l.name)) || [],
    additions: githubPr.additions || 0,
    deletions: githubPr.deletions || 0,
    changedFiles: githubPr.changed_files || 0,
    merged: githubPr.merged || !!githubPr.merged_at || false,
    mergedAt: githubPr.merged_at ? new Date(githubPr.merged_at) : null,
    closedAt: githubPr.closed_at ? new Date(githubPr.closed_at) : null,
    githubCreatedAt: githubPr.created_at ? new Date(githubPr.created_at) : new Date(),
    githubUpdatedAt: githubPr.updated_at ? new Date(githubPr.updated_at) : new Date(),
    htmlUrl: githubPr.html_url || ''
  };
};

/**
 * Maps raw GitHub API issue response to local database schema format.
 */
export const mapIssue = (githubIssue, repoId) => {
  return {
    repoId,
    number: githubIssue.number,
    title: githubIssue.title || '',
    body: githubIssue.body || '',
    state: githubIssue.state || 'open',
    author: {
      login: githubIssue.user?.login || '',
      avatarUrl: githubIssue.user?.avatar_url || '',
      htmlUrl: githubIssue.user?.html_url || ''
    },
    assignees: githubIssue.assignees?.map((a) => ({
      login: a.login,
      avatarUrl: a.avatar_url
    })) || [],
    labels: githubIssue.labels?.map((l) => (typeof l === 'string' ? l : l.name)) || [],
    closedAt: githubIssue.closed_at ? new Date(githubIssue.closed_at) : null,
    githubCreatedAt: githubIssue.created_at ? new Date(githubIssue.created_at) : new Date(),
    githubUpdatedAt: githubIssue.updated_at ? new Date(githubIssue.updated_at) : new Date(),
    htmlUrl: githubIssue.html_url || ''
  };
};
