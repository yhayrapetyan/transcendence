import { retrieveSessionData } from './utils/cookies';
import { establishWebSocketConnection, getWebSocketInstance } from './utils/socket';

export function validateTwoFactorAuthentication(authToken: string | null): boolean {
  if (retrieveSessionData('2fa') === 'true' && retrieveSessionData('2faCode') === 'false') {
    return !authToken;
  } else {
    return !!authToken;
  }
}

export async function navigationRouter() {
  const applicationContainer = document.getElementById('app');
  const currentPath = window.location.pathname;

  const authenticationToken = retrieveSessionData('token');
  let userAuthenticated: boolean;

  userAuthenticated = validateTwoFactorAuthentication(authenticationToken);
  if (userAuthenticated && !getWebSocketInstance() && authenticationToken) {
    establishWebSocketConnection(authenticationToken);
  }

  if (userAuthenticated && (currentPath === '/' || currentPath === '/register')) {
    history.pushState(null, '', '/home');
    import('./views/home/index').then((module) => module.render(applicationContainer!));
    return;
  }

  if (!userAuthenticated && currentPath !== '/' && currentPath !== '/register') {
    history.pushState(null, '', '/');
    import('./views/login/index').then((module) => module.render(applicationContainer!));
    return;
  }

  if (currentPath === '/') {
    import('./views/login/index').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/register') {
    import('./views/register/index').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/home') {
    import('./views/home/index').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/profile') {
    import('./views/profile/index').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/settings') {
    import('./views/settings/index').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/404') {
    import('./views/error/404').then((module) => module.render(applicationContainer!));
  } else if (currentPath === '/tournament/create') {
    import('./views/tournament/createTournament').then(async (module) => {
      const rootElement = document.getElementById('app')!;
      rootElement.innerHTML = '';
      rootElement.appendChild(await module.createTournamentUI());
    });
  } else if (currentPath.startsWith('/tournament/') && !currentPath.includes('/game')) {
    const competitionId = currentPath.split('/')[2];
    const maximumPlayers = Number(currentPath.split('/')[3]);
    import('./views/tournament/viewTournament').then((moduleImport) => {
      const rootElement = document.getElementById('app');
      if (rootElement) {
        moduleImport.renderTournamentPage(rootElement, competitionId, maximumPlayers);
      }
    });
  } else if (currentPath.startsWith('/tournament/game/')) {
    const competitionId = currentPath.split('/')[3];
    import('./views/tournament/tournamentGame').then((moduleImport) => {
      const rootElement = document.getElementById('app');
      if (rootElement) {
        moduleImport.renderTournamentGamePage(rootElement, competitionId);
      }
    });
  } else {
    history.pushState(null, '', '/404');
    import('./views/error/404').then((module) => module.render(applicationContainer!));
  }
}
