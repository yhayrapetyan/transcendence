import twofaController from '../controllers/twofaController.js';

export default async function twoFactorRoutes(serverInstance, options) {
    serverInstance.get('/on', {
        preValidation: [serverInstance.authenticate],
        handler: twofaController.createTwoFactorSetup,
    });

    serverInstance.post('/on', {
        preValidation: [serverInstance.authenticate],
        handler: twofaController.activateTwoFactorAuth,
    });

    serverInstance.post('/off', {
        preValidation: [serverInstance.authenticate],
        handler: twofaController.deactivateTwoFactorAuth,
    });
}
