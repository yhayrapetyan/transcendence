import socketController from '../controllers/socketController.js';

export default async function websocketRoutes(serverInstance) {
  serverInstance.get('/ws', { websocket: true }, socketController.manageWebSocketConnection(serverInstance));
  serverInstance.get('/ws/match/:matchId', { websocket: true }, socketController.manageGameMatchConnection(serverInstance));

  serverInstance.post('/ws/tournament/redirect', async (request, response) => {
    const { userIds: targetUserIds, url: redirectUrl } = request.body;
    await socketController.broadcastPageRedirect(targetUserIds, redirectUrl);
    response.send({ ok: true });
  });
}