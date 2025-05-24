import { buildNavigationBar } from '../../components/navbars';
import { createBackground } from './background';
import { createPaddle } from './paddle';
import { createContent } from './content';
import { retrieveSessionData } from '../../utils/cookies';

export async function render(root: HTMLElement) {
  if (!root) {
    return;
  }

  root.innerHTML = '';
  try {
    const token = retrieveSessionData('token');
    if (!token) {
      throw new Error('No token found');
    }

    const background = createBackground();
    background.appendChild(createPaddle());
    background.appendChild(createContent());
    const navbar = await buildNavigationBar();

    root.appendChild(background);
    if (navbar) {
      root.appendChild(navbar);
    }
  } catch (error) {
    root.innerHTML =
      '<p class="text-red-500">Failed to load profile page. Please try again later.</p>';
    sessionStorage.clear();
  }
}