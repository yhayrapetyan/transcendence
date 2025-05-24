import { register } from './registerService';
import { validateRegisterForm } from './registerValidation';
import { displayNotificationMessage } from '../../components/notification';

export function setupRegisterForm(root: HTMLElement) {
  const form = root.querySelector('#register-form') as HTMLFormElement;
  const loginButton = root.querySelector('#login-button') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    const validationError = validateRegisterForm(email, username, password);
    if (validationError) {
      displayNotificationMessage(validationError, 'error');
      return;
    }

    try {
      await register(email, username, password);
      displayNotificationMessage('Registration successful! Please log in.', 'success');
      history.pushState(null, '', '/');
      import('../../router').then((m) => m.navigationRouter());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      displayNotificationMessage('Registration failed: ' + errorMessage, 'error');
    }
  });

  loginButton.addEventListener('click', () => {
    history.pushState(null, '', '/');
    import('../../router').then((m) => m.navigationRouter());
  });
}