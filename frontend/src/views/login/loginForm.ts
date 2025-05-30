import { authenticateUser } from './loginService';
import { validateLoginForm } from './loginValidation';
import { displayNotificationMessage } from '../../components/notification';
import { retrieveSessionData, storeSessionData } from '../../utils/cookies';
import { establishWebSocketConnection } from '../../utils/socket';

const GOOGLE_CLIENT_ID = '863001182336-hluhbj6klucqs9b87ldm58bskjnvb22m.apps.googleusercontent.com';

export function setupLoginForm(root: HTMLElement) {
  const form = root.querySelector('#login-form') as HTMLFormElement;
  const registerButton = root.querySelector('#register-button') as HTMLButtonElement;

  //@ts-ignore
  window.google?.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response: any) => {
      try {
        const res = await fetch('/api/auth/google-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: response.credential }),
        });

        if (!res.ok) {
          const err = await res.json();
          displayNotificationMessage('Google sign-in failed: ' + (err.error || res.statusText), 'error');
          return;
        }

        const { token } = await res.json();
        storeSessionData('token', token);
        displayNotificationMessage('Google sign-in successful!', 'success');
        establishWebSocketConnection(token);
        history.pushState(null, '', '/home');
        import('../../router').then((m) => m.navigationRouter());
      } catch (err) {
        displayNotificationMessage('Google sign-in error', 'error');
      }
    },
  });
  //@ts-ignore
  window.google?.accounts.id.renderButton(
    document.getElementById('g_id_signin'),
    { theme: 'outline', size: 'large' }
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const validationError = validateLoginForm(email, password);
    if (validationError) {
      displayNotificationMessage(validationError, 'error');
      return;
    }

    try {
      const is2FAEnabled = await authenticateUser(email, password);

      if (is2FAEnabled) {
        const twofaModal = document.getElementById('twofa-modal') as HTMLDivElement;
        if (twofaModal) { 
          twofaModal.classList.remove('hidden');
        }

        displayNotificationMessage('2FA is enabled. Please enter your 2FA code.', 'info');
      } else {
        displayNotificationMessage('Login successful!', 'success');
        const token = retrieveSessionData('token');
        if (token) {
          establishWebSocketConnection(token);
        }
        history.pushState(null, '', '/home');
        import('../../router').then((m) => m.navigationRouter());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      displayNotificationMessage('Login failed: ' + errorMessage, 'error');
    }
  });

  registerButton.addEventListener('click', () => {
    history.pushState(null, '', '/register');
    import('../../router').then((m) => m.navigationRouter());
  });
}