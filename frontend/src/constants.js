export const CATEGORIES = {
  manual:          { label: 'Manuelno',    color: '#4fc3f7', emoji: '🖐' },
  auto:            { label: 'Auto',        color: '#43e97b', emoji: '🤖' },
  postman:         { label: 'Postman',     color: '#ffa726', emoji: '📮' },
  'qa-release':    { label: 'QA Release',  color: '#6c63ff', emoji: '🚀' },
  'prod-release':  { label: 'Prod',        color: '#ff6b6b', emoji: '🏁' },
  regression:      { label: 'Regresija',   color: '#f9ca24', emoji: '🔁' },
  bug:             { label: 'Bug',         color: '#ff6584', emoji: '🐛' },
  review:          { label: 'Review',      color: '#00bcd4', emoji: '👁' },
  docs:            { label: 'Docs',        color: '#9c88ff', emoji: '📝' },
  learning:        { label: 'Učenje',      color: '#ab47bc', emoji: '📚' },
  meeting:         { label: 'Sastanak',    color: '#78909c', emoji: '💬' },
  other:           { label: 'Ostalo',      color: '#90a4ae', emoji: '📌' },
};

export const ACTIONS = {
  executed:     'Izvršen',
  added:        'Dodat novi',
  updated:      'Ažuriran',
  fixed:        'Ispravljen',
  reviewed:     'Pregledan',
  reported:     'Prijavljen',
  released:     'Releazovan',
  investigated: 'Istraživano',
};

export const STATUSES = {
  'not-started': { label: 'Nije početo',  emoji: '⚪', color: '#8b8fa8' },
  'in-progress': { label: 'U toku',       emoji: '🔵', color: '#4fc3f7' },
  'done':        { label: 'Završeno',     emoji: '✅', color: '#43e97b' },
  'blocked':     { label: 'Blokirano',    emoji: '🔴', color: '#ff6b6b' },
};

export function secondsToHuman(s) {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function parseManualTime(str) {
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60;
  return parseFloat(parts[0]) * 3600;
}

export const PROJECTS = [
  { value: 'MSP',           label: 'MSP' },
  { value: 'HttpCustomer',  label: 'HttpCustomer' },
  { value: 'HttpSupplier',  label: 'HttpSupplier' },
  { value: 'MSS',           label: 'MSS' },
  { value: 'URLShortener',  label: 'URLShortener' },
  { value: 'PHPTools',      label: 'PHP tools' },
  { value: 'ChatApps',     label: 'ChatApps' },
  { value: 'MCP',          label: 'MCP' },
  { value: 'AdminConsole',     label: 'Admin Console' },
  { value: 'MailsFromSupport', label: 'Mails from Support' },
  { value: 'SAP',              label: 'SAP' },
];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
