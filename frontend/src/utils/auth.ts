import { retrieveSessionData, removeSessionData } from './cookies';
import { terminateWebSocketConnection } from './socket';

export async function checkUserAuthentication(): Promise<boolean> {
  const authToken = retrieveSessionData('token');
  return !!authToken;
}

export function performUserLogout() {
  terminateWebSocketConnection();
  removeSessionData('token');
  history.pushState(null, '', '/');
  window.location.reload();
}