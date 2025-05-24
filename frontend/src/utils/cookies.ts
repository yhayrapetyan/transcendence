export function storeSessionData(dataKey: string, dataValue: string): void {
  sessionStorage.setItem(dataKey, dataValue);
}

export function retrieveSessionData(dataKey: string): string | null {
  return sessionStorage.getItem(dataKey);
}

export function removeSessionData(dataKey: string): void {
  sessionStorage.removeItem(dataKey);
}