import { storeSessionData } from '../../utils/cookies';

export async function authenticateUser(emailAddress: string, userPassword: string): Promise<boolean> {
  const authResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailAddress, password: userPassword }),
  });

  if (!authResponse.ok) {
    throw new Error('Invalid credentials');
  }

  const responseContent = await authResponse.text();

  if (responseContent.includes('token')) {
    const { token: authToken } = JSON.parse(responseContent);
    storeSessionData('token', authToken);
    storeSessionData('2fa', 'false');
    storeSessionData('2faCode', 'true');
    return false;
  } else if (responseContent.includes('tempToken')) {
    const { tempToken: temporaryToken } = JSON.parse(responseContent);
    storeSessionData('token', temporaryToken);
    storeSessionData('2fa', 'true');
    storeSessionData('2faCode', 'false');
    return true;
  }

  throw new Error('Unexpected response from server');
}