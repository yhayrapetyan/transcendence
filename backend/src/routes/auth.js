import authController from '../controllers/authController.js';
import googleController from '../controllers/googleController.js';

async function authenticationRoutes(serverInstance, options) {
    serverInstance.post('/register', authController.createAccount);
    serverInstance.post('/login', authController.authenticateUser);
    serverInstance.post('/2fa-verify', authController.validateTwoFactorAuth);
    serverInstance.post('/google-signin', googleController.processGoogleAuthentication);
}

export default authenticationRoutes;
