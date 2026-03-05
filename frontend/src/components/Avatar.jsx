import { useState } from 'react';
import { USER_PROFILES } from '../userProfiles';

function initials(username) {
  return username
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Deterministic color per username (for initials fallback)
const COLORS = [
  '#7c6ff7', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6',
];
function colorFor(username) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({ username, avatarData, size = 32, style = {} }) {
  const [failed, setFailed] = useState(false);

  const avatarFile = USER_PROFILES[username]?.avatar ?? username;
  const src = avatarData || `/avatars/${avatarFile}.jpg`;

  const baseStyle = {
    width:  size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.38,
    fontWeight: 700,
    userSelect: 'none',
    ...style,
  };

  if (!failed) {
    return (
      <img
        src={src}
        alt={username}
        width={size}
        height={size}
        style={{ ...baseStyle, display: 'block' }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span style={{ ...baseStyle, background: colorFor(username), color: '#fff' }}>
      {initials(username)}
    </span>
  );
}
