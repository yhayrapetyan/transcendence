import { createTwoFAModal } from './twofaModal';
import { toggleModalVisibility } from './twofaUI';
import { storeSessionData, retrieveSessionData } from '../../../utils/cookies';
import { displayNotificationMessage } from '../../../components/notification';
import { disable2FA, enable2FA, request2FAQrCode } from './twofaService';

export function createTwoFASection(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col items-center gap-4';

  const is2FAEnabled = retrieveSessionData('2fa') === 'true';
  const label = document.createElement('p');
  label.textContent = `2FA is currently ${is2FAEnabled ? 'Enabled' : 'Disabled'}`;
  label.className = 'text-lg font-bold ml-8';

  const button = document.createElement('button');
  button.textContent = is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA';
  button.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded ml-8';

  const { modal, title, input, verifyButton, cancelButton, qrImage } = createTwoFAModal();

  button.addEventListener('click', async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return displayNotificationMessage('No token found', 'error');

    try {
      if (is2FAEnabled) {
        title.textContent = 'Disable 2FA';
        qrImage.style.display = 'none';
        toggleModalVisibility(modal, true);

        verifyButton.onclick = async () => {
          const code = input.value.trim();
          if (!code) return displayNotificationMessage('Enter 2FA code', 'error');

          await disable2FA(token, code);
          storeSessionData('2fa', 'false');
          displayNotificationMessage('2FA disabled successfully!', 'success');
          toggleModalVisibility(modal, false);
          window.location.reload();
        };
      } else {
        const qr = await request2FAQrCode(token);
        title.textContent = 'Enable 2FA';
        qrImage.src = qr;
        qrImage.style.display = 'block';
        modal.querySelector('div')!.insertBefore(qrImage, input);
        toggleModalVisibility(modal, true);

        verifyButton.onclick = async () => {
          const code = input.value.trim();
          if (!code) return displayNotificationMessage('Enter authenticator code', 'error');

          await enable2FA(token, code);
          storeSessionData('2fa', 'true');
          displayNotificationMessage('2FA enabled successfully!', 'success');
          toggleModalVisibility(modal, false);
          window.location.reload();
        };
      }
    } catch (e) {
      displayNotificationMessage('Error toggling 2FA', 'error');
    }
  });

  cancelButton.addEventListener('click', () => {
    toggleModalVisibility(modal, false);
  });

  container.append(label, button, modal);
  return container;
}
