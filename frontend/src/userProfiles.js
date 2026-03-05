// Static user profile data — update during deploy alongside avatars in public/avatars/
// key = exact username from DB
export const USER_PROFILES = {
  Joker:                  { title: 'Test Engineer I' },
  somibro7:               { title: 'Test Engineer I' },
  'misakisic@yahoo.com':  { title: 'Senior Test Engineer', avatar: 'misakisic' },
  bosko:                  { title: 'Test Engineer I' },
};

export function getTitle(username) {
  return USER_PROFILES[username]?.title ?? '';
}
