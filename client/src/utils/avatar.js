/**
 * Returns a data-URI SVG avatar (head + shoulders silhouette).
 * Gender-aware coloring: Male=navy, Female=crimson, default=gold.
 * Used in admit card, profile, officer profile.
 */
export function getDefaultAvatar(gender = 'default', size = 200) {
  const colors = {
    Male: { bg: '#0a1628', fg: '#d4a853' },
    Female: { bg: '#c41e3a', fg: '#ffd9e0' },
    default: { bg: '#6b7788', fg: '#e8ebf0' }
  };
  const { bg, fg } = colors[gender] || colors.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
    <rect width="200" height="200" fill="${bg}"/>
    <circle cx="100" cy="75" r="36" fill="${fg}"/>
    <path d="M100 125 C 60 125 35 145 35 185 L 35 200 L 165 200 L 165 185 C 165 145 140 125 100 125 Z" fill="${fg}"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
