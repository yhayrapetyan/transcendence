import './styles/input.css';
import { navigationRouter } from './router';
import { retrieveSessionData } from './utils/cookies';
import { establishWebSocketConnection, terminateWebSocketConnection } from './utils/socket';

window.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('initialized')) {
    sessionStorage.clear();
    sessionStorage.setItem('initialized', 'true');
  }

  const authToken = retrieveSessionData('token');
  if (authToken) {
    establishWebSocketConnection(authToken);
  }

  navigationRouter();
  window.addEventListener('popstate', navigationRouter);
});

window.addEventListener('beforeunload', () => {
  terminateWebSocketConnection();
});
