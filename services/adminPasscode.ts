const KEY = 'admin_passcode';

export function getAdminPasscode(): string {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminPasscode(passcode: string) {
  try {
    localStorage.setItem(KEY, passcode);
  } catch {
    // ignore
  }
}

export function clearAdminPasscode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
