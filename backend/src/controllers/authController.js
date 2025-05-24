import bcrypt from 'bcryptjs';
import prisma from '../db/prisma.js';
import {app} from '../server.js';
import speakeasy from 'speakeasy';
import { verifyEmailFormat, verifyPasswordStrength } from '../utils/validators.js';
import { createRandomProfileImage } from '../utils/avatar.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);

const createAccount = async (request, response) => {    const { emailAddress, userName, userPassword, profileImageUrl } = request.body;    if (!emailAddress || !userName || !userPassword) {        return response.status(400).send({ error: 'All fields are required.' });    }    if (!verifyEmailFormat(emailAddress)) {        return response.status(400).send({ error: 'Invalid email format.' });    }    if (!verifyPasswordStrength(userPassword)) {        return response.status(400).send({ error: 'Password must be at least 8 characters and include one uppercase letter.' });    }

    try {
        const foundUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: emailAddress }, { username: userName }],
            },
        });

        if (foundUser) {
            return response.status(409).send({ error: 'Email or username already in use.' });
        }

        const encryptedPassword = await bcrypt.hash(userPassword, SALT_ROUNDS);

        const newUser = await prisma.user.create({
            data: {
                email: emailAddress,
                username: userName,
                password: encryptedPassword,
                avatarUrl: profileImageUrl || createRandomProfileImage(userName),
            },
        });

        response.code(201).send({ message: 'User registered successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Registration failed.' });
    }
};

const authenticateUser = async (request, response) => {
    const { emailAddress, userPassword } = request.body;

    if (!emailAddress || !userPassword)
        return response.status(400).send({ error: 'Email and password required.' });

    try {
        const foundUser = await prisma.user.findUnique({ where: { email: emailAddress } });

        if (!foundUser || !(await bcrypt.compare(userPassword, foundUser.password)))
            return response.status(401).send({ error: 'Invalid email or password.' });

        if (foundUser.is2faEnabled) {
            const temporaryToken = await app.jwt.sign(
                { id: foundUser.id, twofa: true },
                { expiresIn: '5m' }
            );

            return response.send({ message: '2FA required.', tempToken: temporaryToken });
        }

        const accessToken = await app.jwt.sign(
            {
                id: foundUser.id,
                email: foundUser.email,
                username: foundUser.username,
            },
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        response.send({ token: accessToken });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Login failed.' });
    }
};

const validateTwoFactorAuth = async (request, response) => {
    const { token: temporaryToken, code } = request.body;

    if (!temporaryToken || !code)
        return response.status(400).send({ error: 'Token and code required.' });

    try {
        const decodedToken = await app.jwt.verify(temporaryToken);

        if (!decodedToken.twofa || !decodedToken.id)
            return response.status(401).send({ error: 'Invalid 2FA token.' });

        const foundUser = await prisma.user.findUnique({ where: { id: decodedToken.id } });

        if (!foundUser || !foundUser.is2faEnabled || !foundUser.twofaSecret)
            return response.status(401).send({ error: '2FA not set up.' });

        const isValidCode = speakeasy.totp.verify({
            secret: foundUser.twofaSecret,
            encoding: 'base32',
            token: code,
        });

        if (!isValidCode)
            return response.status(401).send({ error: 'Invalid 2FA code.' });

        const fullAccessToken = await app.jwt.sign(
            {
                id: foundUser.id,
                email: foundUser.email,
                username: foundUser.username,
            },
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        response.send({ token: fullAccessToken });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: '2FA verification failed.' });
    }
};

export default {
    createAccount,
    authenticateUser,
    validateTwoFactorAuth
};
