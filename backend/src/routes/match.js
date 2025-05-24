import matchController from '../controllers/matchController.js';

export default async function gameMatchRoutes(serverInstance, options) {
    serverInstance.post('/create', {
        preValidation: [serverInstance.authenticate],
        handler: matchController.initializeGameMatch,
    });

    serverInstance.patch('/:matchId/result', {
        preValidation: [serverInstance.authenticate],
        handler: matchController.modifyMatchOutcome,
    });
}
