import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import prisma from '../db/prisma.js';

const createTwoFactorSetup = async (request, response) => {
    const userAccount = await prisma.user.findUnique({ where: { id: request.user.id } });

    if (userAccount.googleId)
        return response.status(403).send({ error: '2FA is not allowed for Google Sign-In users.' });

    if (userAccount.is2faEnabled)
        return response.status(400).send({ error: '2FA is already enabled.' });

    const secretKey = speakeasy.generateSecret({
        name: `ft_transcendence (${userAccount.username})`,
    });

    await prisma.user.update({
        where: { id: userAccount.id },
        data: {
            twofaSecret: secretKey.base32,
        },
    });

    const qrCodeData = await qrcode.toDataURL(secretKey.otpauth_url);

    response.send({
        message: 'Scan the QR with Google Authenticator',
        qr: qrCodeData,
        base32: secretKey.base32,
    });
};

const activateTwoFactorAuth = async (request, response) => {
    const { code: verificationCode } = request.body;
    const userAccount = await prisma.user.findUnique({ where: { id: request.user.id } });

    if (userAccount.googleId)
        return response.status(403).send({ error: '2FA is not allowed for Google Sign-In users.' });

    if (userAccount.is2faEnabled)
        return response.status(400).send({ error: '2FA is already enabled.' });

    const isCodeValid = speakeasy.totp.verify({
        secret: userAccount.twofaSecret,
        encoding: 'base32',
        token: verificationCode,
    });

    if (!isCodeValid)
        return response.status(401).send({ error: 'Invalid 2FA code.' });

    await prisma.user.update({
        where: { id: userAccount.id },
        data: {
            is2faEnabled: true,
        },
    });

    response.send({ message: '2FA enabled successfully.' });
};

const deactivateTwoFactorAuth = async (request, response) => {
    const { code: verificationCode } = request.body;
    const userAccount = await prisma.user.findUnique({ where: { id: request.user.id } });

    if (userAccount.googleId)
        return response.status(403).send({ error: '2FA is not allowed for Google Sign-In users.' });

    if (!userAccount.is2faEnabled)
        return response.status(400).send({ error: '2FA is not enabled.' });

    const isCodeValid = speakeasy.totp.verify({
        secret: userAccount.twofaSecret,
        encoding: 'base32',
        token: verificationCode,
    });

    if (!isCodeValid)
        return response.status(401).send({ error: 'Invalid 2FA code.' });

    await prisma.user.update({
        where: { id: userAccount.id },
        data: {
            is2faEnabled: false,
            twofaSecret: null,
        },
    });

    response.send({ message: '2FA disabled successfully.' });
};

export default {
    createTwoFactorSetup,
    activateTwoFactorAuth,
    deactivateTwoFactorAuth,
};
