import authenticationRoutes from './auth.js';
import userDataRoutes from './user.js';
import gameMatchRoutes from './match.js';
import twoFactorRoutes from './2fa.js';
import websocketRoutes from './socket.js';
import competitionRoutes from './tournament.js';

export default async function initializeRoutes(serverInstance, options) {
    serverInstance.register(authenticationRoutes, {prefix: '/auth'});
    serverInstance.register(userDataRoutes, {prefix: '/user'});
    serverInstance.register(gameMatchRoutes, {prefix: '/match'});
    serverInstance.register(twoFactorRoutes, { prefix: '/2fa' });
    serverInstance.register(competitionRoutes, { prefix: '/tournament' });
    serverInstance.register(websocketRoutes, { prefix: '' });
}
