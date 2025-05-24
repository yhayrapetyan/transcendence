import prisma from '../db/prisma.js';

const activeUserConnections = new Map();
const gameMatchConnections = new Map();
const gameMatchBallData = new Map();
const gameMatchScoreData = new Map();

const manageWebSocketConnection = (serverInstance) => {
    return async function (connectionSocket, incomingRequest) {
        let authToken = incomingRequest.headers['sec-websocket-protocol'];
        if (Array.isArray(authToken)) authToken = authToken[0];
        if (!authToken) return connectionSocket?.close();

        try {
            const decodedToken = await serverInstance.jwt.verify(authToken);
            const currentUserId = decodedToken.id;
            activeUserConnections.set(currentUserId, connectionSocket);

            connectionSocket.on('message', (rawData) => {
                try {
                    const messageData = JSON.parse(rawData.toString());
                    if (messageData.type === 'ping') {
                        connectionSocket.send(JSON.stringify({ type: 'pong' }));
                    }
                } catch (error) {
                    console.warn('❌ Invalid message format:', error.message);
                }
            });

            connectionSocket.on('close', () => {
                activeUserConnections.delete(currentUserId);
            });
        } catch (error) {
            console.warn('❌ Invalid WS token:', error.message);
            return connectionSocket?.close();
        }
    };
};

const manageGameMatchConnection = (serverInstance) => {
    return async function (connectionSocket, incomingRequest) {
        const gameMatchId = parseInt(incomingRequest.params.matchId);

        let authToken = incomingRequest.headers['sec-websocket-protocol'];
        if (Array.isArray(authToken)) authToken = authToken[0];
        if (!authToken) return connectionSocket?.close();

        let decodedToken;
        try {
            decodedToken = await serverInstance.jwt.verify(authToken);
        } catch (error) {
            console.warn('❌ Invalid WS token:', error.message);
            return connectionSocket?.close();
        }

        const currentUserId = decodedToken.id;

        const gameMatch = await prisma.tournamentMatch.findUnique({
            where: { id: gameMatchId },
            select: {
                player1Id: true,
                player2Id: true,
                tournamentId: true,
            },
        });

        if (!gameMatchConnections.has(gameMatchId)) gameMatchConnections.set(gameMatchId, []);
        gameMatchConnections.get(gameMatchId).push(connectionSocket);

        const gameState = gameMatchBallData.get(gameMatchId);
        if (gameState) {
            connectionSocket.send(JSON.stringify({
                type: 'paddle_positions',
                paddle1z: gameState.paddle1z,
                paddle2z: gameState.paddle2z
            }));
        }

        connectionSocket.on('message', (rawData) => {
            try {
                const messageData = JSON.parse(rawData.toString());
                if (messageData.type === 'ping') {
                    connectionSocket.send(JSON.stringify({ type: 'pong' }));
                    return;
                }
                if (messageData.type === 'redirect') {
                    connectionSocket.send(JSON.stringify({ type: 'redirect', url: messageData.url }));
                    return;
                }
                if (messageData.type === 'paddle_move') {
                    const gameState = gameMatchBallData.get(gameMatchId);
                    if (gameState) {
                        if (messageData.role === 'player1') gameState.paddle1z = messageData.z;
                        if (messageData.role === 'player2') gameState.paddle2z = messageData.z;
                        gameMatchConnections.get(gameMatchId)?.forEach((clientSocket) => {
                            if (clientSocket.readyState === 1) {
                                clientSocket.send(JSON.stringify({
                                    type: 'paddle_positions',
                                    paddle1z: gameState.paddle1z,
                                    paddle2z: gameState.paddle2z
                                }));
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn('❌ Invalid message format:', error.message);
            }
        });

        connectionSocket.on('close', () => {
            const remainingSockets = gameMatchConnections.get(gameMatchId)?.filter((socketConnection) => socketConnection !== connectionSocket);
            if (!remainingSockets?.length) {
                gameMatchConnections.delete(gameMatchId);
            } else {
                gameMatchConnections.set(gameMatchId, remainingSockets);
            }
        });

        const currentScores = gameMatchScoreData.get(gameMatchId) || { player1: 0, player2: 0 };
        connectionSocket.send(JSON.stringify({ type: 'score_update', scores: currentScores }));

        setTimeout(() => initializeBallForGameMatch(gameMatchId), 5000);
    };
};

function initializeBallForGameMatch(gameMatchId) {
    let ballPosition = { x: 0, y: 0.435, z: 0 };
    let ballDirection = { x: 0, y: 0, z: 0 };
    let firstPaddleZ = 0, secondPaddleZ = 0;
    let paddleSize = 1.5;
    let firstPaddleX = -4.5, secondPaddleX = 4.5;

    if (!gameMatchBallData.has(gameMatchId)) {
        gameMatchBallData.set(gameMatchId, { position: ballPosition, direction: ballDirection, interval: null, paddle1z: firstPaddleZ, paddle2z: secondPaddleZ });
    }

    if (!gameMatchScoreData.has(gameMatchId)) {
        gameMatchScoreData.set(gameMatchId, { player1: 0, player2: 0 });
    }

    const gameState = gameMatchBallData.get(gameMatchId);

    function createRandomDirection() {
        return {
            x: Math.random() > 0.5 ? 0.05 : -0.05,
            y: 0,
            z: (Math.random() * 0.06) - 0.03
        };
    }

    function reinitializeBall(delayTime = 3000) {
        gameState.position = { x: 0, y: 0.435, z: 0 };
        gameState.direction = { x: 0, y: 0, z: 0 };
        setTimeout(() => {
            gameState.direction = createRandomDirection();
        }, delayTime);
    }

    function updateGameTick() {
        let { position: ballPosition, direction: ballDirection } = gameState;
        ballPosition.x += ballDirection.x;
        ballPosition.z += ballDirection.z;

        if (ballPosition.z > 3 || ballPosition.z < -3) ballDirection.z *= -1;

        if (
            ballDirection.x < 0 &&
            ballPosition.x < firstPaddleX - 0.23 &&
            Math.abs(ballPosition.z - gameState.paddle1z) < paddleSize / 2
        ) {
            ballDirection.x *= -1;
            ballDirection.z += (ballPosition.z - gameState.paddle1z) * 0.05;
        }

        if (
            ballDirection.x > 0 &&
            ballPosition.x > secondPaddleX + 0.23 &&
            Math.abs(ballPosition.z - gameState.paddle2z) < paddleSize / 2
        ) {
            ballDirection.x *= -1;
            ballDirection.z += (ballPosition.z - gameState.paddle2z) * 0.05;
        }

        if (ballPosition.x > 5 || ballPosition.x < -5) {
            const goalScorer = ballPosition.x > 5 ? 'player1' : 'player2';

            const currentScores = gameMatchScoreData.get(gameMatchId) || { player1: 0, player2: 0 };
            currentScores[goalScorer]++;
            gameMatchScoreData.set(gameMatchId, currentScores);

            gameMatchConnections.get(gameMatchId)?.forEach((clientSocket) => {
                if (clientSocket.readyState === 1) {
                    clientSocket.send(JSON.stringify({ type: 'goal', scorer: goalScorer, scores: currentScores }));
                }
            });
            reinitializeBall();
            return;
        }

        gameMatchConnections.get(gameMatchId)?.forEach((clientSocket) => {
            if (clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({ type: 'ball_update', position: ballPosition, direction: ballDirection }));
            }
        });
    }

    reinitializeBall();
    gameState.interval = setInterval(updateGameTick, 16);
}

const broadcastTournamentStart = async (participantUserIds, gameMatchInformation) => {
    console.log('Match info:', gameMatchInformation);
    for (const participantId of participantUserIds) {
        const userConnection = activeUserConnections.get(participantId);
        if (userConnection?.readyState === 1) {
            userConnection.send(JSON.stringify({
                type: 'tournament_started',
                redirectTo: `/tournament/game/${gameMatchInformation.tournamentId}`,
                ...gameMatchInformation
            }));
        }
    }
};

const broadcastPageRedirect = async (targetUserIds, redirectUrl) => {
    for (const targetUserId of targetUserIds) {
        const userConnection = activeUserConnections.get(targetUserId);
        if (userConnection?.readyState === 1) {
            userConnection.send(JSON.stringify({ type: 'redirect', url: redirectUrl }));
        }
    }
};

const checkUserOnlineStatus = (userId) => activeUserConnections.has(userId);
const retrieveOnlineUsers = () => activeUserConnections;

export default {
    manageWebSocketConnection,
    manageGameMatchConnection,
    broadcastTournamentStart,
    broadcastPageRedirect,
    checkUserOnlineStatus,
    retrieveOnlineUsers
};
