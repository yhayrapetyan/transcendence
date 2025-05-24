export function displayNotificationMessage(messageText: string, messageType: 'success' | 'error' | 'info' = 'success') {
  const notificationElement = document.createElement('div');
  notificationElement.textContent = messageText;
  notificationElement.className = `
    fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg text-white
    ${messageType === 'success' ? 'bg-green-500' : messageType === 'error' ? 'bg-red-500' : 'bg-yellow-500'}
  `;
  notificationElement.style.zIndex = '1000';

  document.body.appendChild(notificationElement);

  setTimeout(() => {
    notificationElement.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => notificationElement.remove(), 500);
  }, 3000);
}