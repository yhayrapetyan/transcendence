import prisma from '../db/prisma.js';

const initializeGameMatch = async (request, response) => {
    const { opponentId: challengerId } = request.body;
    const currentUserId = request.user.id;

    if (currentUserId === challengerId)
        return response.status(400).send({ error: "You can't play against yourself." });

    try {
        const challengerUser = await prisma.user.findUnique({ where: { id: challengerId } });

        if (!challengerUser)
            return response.status(404).send({ error: "Opponent not found." });

        const gameMatch = await prisma.match.create({
            data: {
                player1Id: currentUserId,
                player2Id: challengerId,
                winnerId: currentUserId,
            },
            include: {
                player1: true,
                player2: true,
            },
        });

        response.send({
            message: 'Match created.',
            match: {
                id: gameMatch.id,
                vs: `${gameMatch.player1.username} vs ${gameMatch.player2.username}`,
                winner: gameMatch.player1.username,
                playedAt: gameMatch.playedAt,
            },
        });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to create match.' });
    }
};

const modifyMatchOutcome = async (request, response) => {
    const { matchId: gameMatchId } = request.params;
    const { winnerId: victorId } = request.body;
    const currentUserId = request.user.id;

    try {
        const gameMatch = await prisma.match.findUnique({ where: { id: parseInt(gameMatchId) } });

        if (!gameMatch)
            return response.status(404).send({ error: 'Match not found.' });

        if (gameMatch.player1Id !== currentUserId && gameMatch.player2Id !== currentUserId)
            return response.status(403).send({ error: 'Not your match to update.' });

        const modifiedMatch = await prisma.match.update({
            where: { id: parseInt(gameMatchId) },
            data: { winnerId: victorId },
        });

        const defeatedPlayerId =
            modifiedMatch.player1Id === victorId
                ? modifiedMatch.player2Id
                : modifiedMatch.player1Id;

        await prisma.user.updateMany({
            where: { id: { in: [victorId, defeatedPlayerId] } },
            data: {
                totalMatches: { increment: 1 },
            },
        });

        await prisma.user.update({
            where: { id: victorId },
            data: {
                wins: { increment: 1 },
            },
        });

        await prisma.user.update({
            where: { id: defeatedPlayerId },
            data: {
                losses: { increment: 1 },
            },
        });

        response.send({ message: 'Match result updated & stats saved.', matchId: gameMatchId });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to update match result.' });
    }
};

export default {
    initializeGameMatch,
    modifyMatchOutcome,
};
