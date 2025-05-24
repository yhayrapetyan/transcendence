import { OAuth2Client } from 'google-auth-library';
import prisma from '../db/prisma.js';
import { app } from '../server.js';
import { createRandomProfileImage } from '../utils/avatar.js';

const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createUsernameFromEmail = (emailAddress) => {
  const emailPrefix = emailAddress.split('@')[0];
  const randomString = Math.random().toString(36).substring(2, 7);
  return `${emailPrefix}_${randomString}`;
};

const processGoogleAuthentication = async (request, response) => {
  const { token: googleToken } = request.body;

  if (!googleToken) return response.status(400).send({ error: 'Missing Google token' });

  try {
    const verificationTicket = await oauthClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const tokenPayload = verificationTicket.getPayload();
    const { sub: googleUserId, email: userEmail, name: displayName, picture: profilePicture } = tokenPayload;

    let userAccount = await prisma.user.findUnique({ where: { googleId: googleUserId } });

    if (!userAccount) {
      userAccount = await prisma.user.findUnique({ where: { email: userEmail } });

      if (userAccount) {
        userAccount = await prisma.user.update({
          where: { email: userEmail },
          data: {
            googleId: googleUserId,
          },
        });
      } else {
        const generatedUsername = createUsernameFromEmail(userEmail);
        userAccount = await prisma.user.create({
          data: {
            email: userEmail,
            username: generatedUsername,
            googleId: googleUserId,
            avatarUrl: profilePicture || createRandomProfileImage(generatedUsername),
          },
        });
      }
    }

    const authenticationToken = await app.jwt.sign({
      id: userAccount.id,
      email: userAccount.email,
      username: userAccount.username,
    });

    response.send({ token: authenticationToken });
  } catch (error) {
    console.error('Google sign-in error:', error);
    response.status(500).send({ error: 'Authentication failed' });
  }
};

export default { processGoogleAuthentication };
