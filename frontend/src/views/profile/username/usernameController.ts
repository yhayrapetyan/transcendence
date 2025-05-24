import { updateAvatarIfNeeded, updateUsername } from './usernameService';
import { displayNotificationMessage } from '../../../components/notification';

export async function onUsernameSave(
  newUsername: string,
  avatarURL: string,
  usernameDisplay: HTMLElement
): Promise<void> {
  const token = sessionStorage.getItem('token');
  if (!token) throw new Error('No token found');

  await updateUsername(newUsername, token);
  await updateAvatarIfNeeded(avatarURL, token);

  usernameDisplay.textContent = `Username: ${newUsername}`;
  displayNotificationMessage('Username updated successfully!', 'success');
  window.location.reload();
}
