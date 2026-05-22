export const mockUser = {
  name: 'Pravin Dev',
  email: 'pravin@test.com',
  password: 'Password@123'
};

export const mockUserTwo = {
  name: 'Jane Doe',
  email: 'jane@test.com',
  password: 'Password@456'
};

export const mockRepo = {
  githubRepoId: 123456,
  name: 'devtrackr',
  fullName: 'pravin/devtrackr',
  description: 'Test repository',
  isPrivate: false,
  defaultBranch: 'main',
  language: 'JavaScript',
  stars: 10,
  forks: 2,
  openIssuesCount: 5
};

export const mockCommit = {
  sha: 'abc123def456',
  message: 'feat: add user authentication',
  author: {
    name: 'Pravin',
    email: 'pravin@test.com',
    login: 'pravin'
  },
  additions: 50,
  deletions: 10,
  filesChanged: 3,
  committedAt: new Date('2024-01-15T10:00:00Z')
};
