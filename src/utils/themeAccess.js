function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getNormalizedRole() {
  const fromUser = readStoredUser()?.role;
  const fromStorage = localStorage.getItem('role');
  const raw = (fromUser || fromStorage || '').toString().trim().toLowerCase();
  if (raw === 'superadmin') return 'super_admin';
  return raw;
}

const HEADER_THEME_ROLES = new Set(['admin', 'agent', 'manager', 'super_admin', 'superadmin']);

export function canUseHeaderTheme() {
  const role = getNormalizedRole();
  if (HEADER_THEME_ROLES.has(role)) return true;
  try {
    if (localStorage.getItem('token')) return true;
  } catch {
    /* ignore */
  }
  return true;
}
