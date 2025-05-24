import prisma from '../db/prisma.js';
import socketController from './socketController.js';

function randomizeArrayOrder(arrayToShuffle) {
    let arrayLength = arrayToShuffle.length;
    while (arrayLength) {
        const randomIndex = Math.floor(Math.random() * arrayLength--);
        [arrayToShuffle[arrayLength], arrayToShuffle[randomIndex]] = [arrayToShuffle[randomIndex], arrayToShuffle[arrayLength]];
    }
    return arrayToShuffle;
}

const initializeCompetition = async (request, response) => {
    const { name: competitionName } = request.body;
    const newCompetition = await prisma.tournament.create({
        data: {
            name: competitionName,
            currentRound: 0,
        },
    });
    response.send(newCompetition);
};

const commenceCompetition = async (request, response) => {
    const { id: competitionId } = request.params;
    const tournamentId = parseInt(competitionId);
    const { userIds: participantIds } = request.body;

    if (!Array.isArray(participantIds) || participantIds.length < 2 || participantIds.length % 2 !== 0) {
        return response.status(400).send({ error: 'Provide an even number of userIds (at least 2).' });
    }

    const onlineUserConnections = socketController.retrieveOnlineUsers();
    for (const participantId of participantIds) {
        if (!onlineUserConnections.has(participantId)) {
            return response.status(403).send({ error: `User ${participantId} must be online to join the tournament.` });
        }
    }

    const participantUsers = await prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, username: true, avatarUrl: true },
    });

    if (participantUsers.length !== participantIds.length) {
        return response.status(404).send({ error: 'One or more users not found.' });
    }

    const randomizedParticipants = randomizeArrayOrder([...participantUsers]);

    const matchCreationTasks = [];
    for (let index = 0; index < randomizedParticipants.length; index += 2) {
        matchCreationTasks.push(
            prisma.tournamentMatch.create({
                data: {
                    tournamentId,
                    round: 1,
                    matchOrder: index / 2 + 1,
                    player1Id: randomizedParticipants[index].id,
                    player2Id: randomizedParticipants[index + 1].id,
                },
            })
        );
    }

    const participantRegistrationTasks = participantIds.map(participantId =>
        prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId: participantId,
            }
        })
    );

    await prisma.$transaction([
        prisma.tournament.update({
            where: { id: tournamentId },
            data: { currentRound: 1 },
        }),
        ...participantRegistrationTasks,
        ...matchCreationTasks
    ]);

    await socketController.broadcastTournamentStart(participantIds, {
        player1Id: randomizedParticipants[0].id,
        player2Id: randomizedParticipants[1].id,
        tournamentId: tournamentId,
    });

    response.send({ message: 'Tournament started!' });
};

const retrieveUpcomingMatch = async (request, response) => {
    const { id: competitionId } = request.params;
    const tournamentId = parseInt(competitionId);

    const nextMatch = await prisma.tournamentMatch.findFirst({
        where: {
            tournamentId,
            winnerId: null,
        },
        orderBy: [
            { round: 'asc' },
            { matchOrder: 'asc' },
        ],
        include: {
            player1: {
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                }
            },
            player2: {
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                }
            },
        },
    });

    const competitionParticipants = await prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                }
            }
        }
    });

    const allParticipants = competitionParticipants.map(participantRecord => participantRecord.user);

    response.send({
        match: nextMatch || null,
        participants: allParticipants
    });
};

const recordMatchOutcome = async (request, response) => {
    const { id: competitionId, mid: gameMatchId } = request.params;
    const { winnerId: victorId } = request.body;
    const tournamentId = parseInt(competitionId);
    const matchId = parseInt(gameMatchId);

    try {
        const existingMatch = await prisma.tournamentMatch.findUnique({
            where: { id: matchId },
            select: { winnerId: true, player1Id: true, player2Id: true }
        });

        if (existingMatch?.winnerId) {
            return response.status(400).send({ error: 'Match result already submitted' });
        }

        if (![existingMatch.player1Id, existingMatch.player2Id].includes(parseInt(victorId))) {
            return response.status(400).send({ error: 'Winner must be one of the two match players' });
        }

        const completedMatch = await prisma.tournamentMatch.update({
            where: { id: matchId },
            data: { winnerId: parseInt(victorId), playedAt: new Date() },
            select: {
                id: true,
                round: true,
                tournamentId: true,
            },
        });

        const pendingMatches = await prisma.tournamentMatch.count({
            where: {
                tournamentId: completedMatch.tournamentId,
                round: completedMatch.round,
                winnerId: null
            }
        });

        if (pendingMatches === 0) {
            const roundWinners = await prisma.tournamentMatch.findMany({
                where: {
                    tournamentId: completedMatch.tournamentId,
                    round: completedMatch.round
                },
                select: {
                    winner: { select: { id: true } }
                }
            });

            const winnerIdList = roundWinners.map(winnerRecord => winnerRecord.winner?.id).filter(Boolean);

            if (winnerIdList.length === 1) {
                await prisma.tournament.update({
                    where: { id: completedMatch.tournamentId },
                    data: { currentRound: completedMatch.round + 1 }
                });
                return response.send({ message: 'Tournament finished!', championId: winnerIdList[0] });
            }

            const distinctWinners = [...new Set(winnerIdList)];

            if (distinctWinners.length % 2 !== 0) {
                return response.status(400).send({ error: 'Odd number of unique winners. Cannot pair up evenly.' });
            }

            const shuffledWinners = randomizeArrayOrder([...distinctWinners]);

            for (let index = 0; index < shuffledWinners.length; index += 2) {
                if (shuffledWinners[index] === shuffledWinners[index + 1]) {
                    return response.status(500).send({ error: 'Cannot create match with the same user for both players.' });
                }

                await prisma.tournamentMatch.create({
                    data: {
                        tournamentId: completedMatch.tournamentId,
                        round: completedMatch.round + 1,
                        matchOrder: index / 2 + 1,
                        player1Id: shuffledWinners[index],
                        player2Id: shuffledWinners[index + 1],
                    },
                });
            }

            await prisma.tournament.update({
                where: { id: completedMatch.tournamentId },
                data: { currentRound: completedMatch.round + 1 }
            });
        }

        return response.send({ message: 'Match result submitted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to submit tournament match result.' });
    }
};

const retrieveCompetitionBracket = async (request, response) => {
    const { id: competitionId } = request.params;
    const allMatches = await prisma.tournamentMatch.findMany({
        where: { tournamentId: parseInt(competitionId) },
        orderBy: [
            { round: 'asc' },
            { matchOrder: 'asc' },
        ],
        include: {
            player1: { select: { id: true, username: true, avatarUrl: true } },
            player2: { select: { id: true, username: true, avatarUrl: true } },
            winner:  { select: { id: true, username: true } },
        },
    });

    response.send(allMatches);
};

export default {
    initializeCompetition,
    commenceCompetition,
    retrieveUpcomingMatch,
    recordMatchOutcome,
    retrieveCompetitionBracket,
};
