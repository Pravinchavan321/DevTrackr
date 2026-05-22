/**
 * Formats a UTC date string into a user-friendly readable format.
 * @param {string|Date} dateVal - Date value to format
 * @returns {string} Formatted date e.g. "May 22, 2026"
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Returns a human-readable relative time-ago string.
 * @param {string|Date} dateVal - Date value to compute
 * @returns {string} Relative time e.g. "3 days ago"
 */
export function timeAgo(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Returns an ISO date string (YYYY-MM-DD) suitable for date inputs.
 * @param {string|Date} dateVal - Date value
 * @returns {string} ISO Date String
 */
export function getISODateString(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Returns a date object representing N days ago.
 * @param {number} days - Number of days ago
 * @returns {string} ISO Date String for N days ago
 */
export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getISODateString(date);
}

