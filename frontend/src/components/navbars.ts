import { checkUserAuthentication, performUserLogout } from '../utils/auth';
import { getIcon } from '../icons/getIcon';

export async function buildNavigationBar(): Promise<HTMLElement | null> {
  const userIsAuthenticated = await checkUserAuthentication();
  if (!userIsAuthenticated) return null;

  const navigationElement = document.createElement('nav');
  navigationElement.className = 'fixed top-0 left-0 h-full w-16 sm:w-20 md:w-24 bg-gray-800 flex flex-col items-center py-6 gap-12 transition-all';

  const navigationLinks = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/tournament/create', label: 'Matchmaking', icon: 'game' },
    { href: '/profile', label: 'Profile', icon: 'profile' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  navigationLinks.forEach(({ href, label, icon }) => {
    const linkElement = document.createElement('a');
    linkElement.href = href;
    linkElement.title = label;
    linkElement.className = 'flex justify-center items-center w-full text-white hover:text-blue-400 cursor-pointer text-lg sm:text-xl md:text-2xl';
    linkElement.innerHTML = getIcon(icon);
    linkElement.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      history.pushState(null, '', href);
      import('../router').then((routerModule) => routerModule.navigationRouter());
    });
    navigationElement.appendChild(linkElement);
  });

  const logoutButtonElement = document.createElement('button');
  logoutButtonElement.title = 'Logout';
  logoutButtonElement.className = 'mt-auto flex justify-center items-center w-full text-white hover:text-red-400 cursor-pointer text-lg sm:text-xl md:text-2xl';
  logoutButtonElement.innerHTML = getIcon('logout');
  logoutButtonElement.addEventListener('click', performUserLogout);
  navigationElement.appendChild(logoutButtonElement);

  return navigationElement;
}
