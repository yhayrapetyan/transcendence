import prisma from '../db/prisma.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import socketController from './socketController.js';
import { createRandomProfileImage } from '../utils/avatar.js';

const getCurrentUserProfile = async (request, response) => {
    const currentUserId = request.user.id;

    const userProfile = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
        },
    });

    if (!userProfile) {
        return response.status(404).send({ error: 'User not found' });
    }

    const casualWins = await prisma.match.count({
        where: { winnerId: currentUserId },
    });

    const casualLosses = await prisma.match.count({
        where: {
            winnerId: { not: currentUserId },
            OR: [
                { player1Id: currentUserId },
                { player2Id: currentUserId },
            ],
        },
    });

    const competitionWins = await prisma.tournamentMatch.count({
        where: {
            winnerId: currentUserId,
        },
    });

    const competitionLosses = await prisma.tournamentMatch.count({
        where: {
            winnerId: {
                not: currentUserId,
            },
            AND: {
                OR: [
                    { player1Id: currentUserId },
                    { player2Id: currentUserId },
                ],
            },
        },
    });

    const totalVictories = casualWins + competitionWins;
    const totalDefeats = casualLosses + competitionLosses;
    const totalGamesPlayed = totalVictories + totalDefeats;

    response.send({
        user: {
            ...userProfile,
            wins: totalVictories,
            losses: totalDefeats,
            totalMatches: totalGamesPlayed,
        },
    });
};

const uploadProfileImage = async (request, response) => {
    const currentUserId = request.user.id;
    const fileData = await request.file();

    if (!fileData || !fileData.filename) {
        return response.status(400).send({ error: 'No file uploaded' });
    }

    const fileExtension = path.extname(fileData.filename);
    const uniqueFileName = crypto.randomUUID() + fileExtension;
    const fileName = uniqueFileName;
    const filePath = `/app/public/avatars/${fileName}`;
    const publicImageUrl = `/avatars/${fileName}`;

    try {
        const userRecord = await prisma.user.findUnique({ where: { id: currentUserId } });

        if (userRecord.avatarUrl?.startsWith('/avatars/')) {
            const previousFile = path.join('/app/public', userRecord.avatarUrl);
            try {
                await fs.unlink(previousFile);
            } catch (error) {
                console.warn(`Old avatar not found or already deleted: ${previousFile}`);
            }
        }

        await fs.mkdir('/app/public/avatars', { recursive: true });
        await fs.writeFile(filePath, await fileData.toBuffer());

        const updatedUserRecord = await prisma.user.update({
            where: { id: currentUserId },
            data: { avatarUrl: publicImageUrl },
        });

        response.send({ message: 'Avatar uploaded', avatarUrl: updatedUserRecord.avatarUrl });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to upload avatar' });
    }
};

const modifyProfileImage = async (request, response) => {
    const currentUserId = request.user.id;
    const { avatarUrl: newAvatarUrl } = request.body;

    try {
        const userRecord = await prisma.user.findUnique({ where: { id: currentUserId } });

        if (!userRecord)
            return response.status(404).send({ error: 'User not found.' });

        if (
            userRecord.avatarUrl?.startsWith('/avatars/') &&
            (!newAvatarUrl || newAvatarUrl.startsWith('http'))
        ) {
            const previousFile = path.join('/app/public', userRecord.avatarUrl);
            try {
                await fs.unlink(previousFile);
            } catch (error) {
                console.warn(`Old avatar not found or already deleted: ${previousFile}`);
            }
        }

        const finalAvatarUrl =
            newAvatarUrl && newAvatarUrl.trim() !== ''
                ? newAvatarUrl
                : createRandomProfileImage(userRecord.username);

        const modifiedUser = await prisma.user.update({
            where: { id: currentUserId },
            data: { avatarUrl: finalAvatarUrl },
        });

        response.send({
            message: 'Avatar updated.',
            avatarUrl: modifiedUser.avatarUrl,
        });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to update avatar.' });
    }
};

const createFriendship = async (request, response) => {
    const currentUserId = request.user.id;
    const targetFriendId = parseInt(request.params.friendId);

    if (currentUserId === targetFriendId)
        return response.status(400).send({ error: "You can't friend yourself." });

    try {
        const existingFriendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { userId: currentUserId, friendId: targetFriendId },
                    { userId: targetFriendId, friendId: currentUserId },
                ],
            },
        });

        if (existingFriendship)
            return response.status(400).send({ error: "You're already friends." });

        await prisma.friendship.create({
            data: { userId: currentUserId, friendId: targetFriendId },
        });

        response.send({ message: "Friend added." });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to add friend.' });
    }
};

const retrieveFriendsList = async (request, response) => {
    const currentUserId = request.user.id;

    try {
        const friendshipRecords = await prisma.friendship.findMany({
            where: {
                OR: [
                    { userId: currentUserId },
                    { friendId: currentUserId },
                ],
            },
            include: {
                user: true,
                friend: true,
            },
        });

        const friendsData = friendshipRecords.map((friendship) => {
            const friendProfile =
                friendship.userId === currentUserId ? friendship.friend : friendship.user;
            return {
                id: friendProfile.id,
                username: friendProfile.username,
                avatarUrl: friendProfile.avatarUrl,
                isOnline: socketController.checkUserOnlineStatus(friendProfile.id),
            };
        });

        response.send({ friends: friendsData });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to get friends list.' });
    }
};

const fetchGameHistory = async (request, response) => {
  const currentUserId = request.user.id;

  try {
    const casualGameMatches = await prisma.match.findMany({
      where: {
        OR: [{ player1Id: currentUserId }, { player2Id: currentUserId }],
      },
      include: {
        player1: true,
        player2: true,
        winner: true,
      },
      orderBy: { playedAt: 'desc' },
    });

    const casualGameHistory = casualGameMatches.map((gameMatch) => {
      const isPlayerWinner = gameMatch.winnerId === currentUserId;
      const opponentPlayer =
        gameMatch.player1Id === currentUserId ? gameMatch.player2 : gameMatch.player1;

      return {
        id: gameMatch.id,
        opponent: opponentPlayer?.username || 'Unknown',
        opponentAvatar: opponentPlayer?.avatarUrl || '',
        result: isPlayerWinner ? 'win' : 'loss',
        playedAt: gameMatch.playedAt,
        type: 'casual',
      };
    });

    const competitionMatches = await prisma.tournamentMatch.findMany({
      where: {
        OR: [{ player1Id: currentUserId }, { player2Id: currentUserId }],
      },
      include: {
        player1: true,
        player2: true,
        winner: true,
        tournament: true,
      },
      orderBy: { playedAt: 'desc' },
    });

    const competitionGameHistory = competitionMatches.map((tournamentMatch) => {
      const isPlayerWinner = tournamentMatch.winnerId === currentUserId;
      const opponentPlayer =
        tournamentMatch.player1Id === currentUserId ? tournamentMatch.player2 : tournamentMatch.player1;

      return {
        id: tournamentMatch.id,
        opponent: opponentPlayer?.username || 'Unknown',
        opponentAvatar: opponentPlayer?.avatarUrl || '',
        result: isPlayerWinner ? 'win' : 'loss',
        playedAt: tournamentMatch.playedAt,
        type: 'tournament',
        tournamentName: tournamentMatch.tournament?.name || 'Unknown Tournament',
      };
    });

    const completeGameHistory = [...casualGameHistory, ...competitionGameHistory].sort(
      (firstMatch, secondMatch) => new Date(secondMatch.playedAt) - new Date(firstMatch.playedAt)
    );

    response.send({ history: completeGameHistory });
  } catch (error) {
    console.error(error);
    response.status(500).send({ error: 'Failed to load match history.' });
  }
};

const modifyUserName = async (request, response) => {
    const currentUserId = request.user.id;
    const { username: newUserName } = request.body;

    if (!newUserName || newUserName.trim() === '')
        return response.status(400).send({ error: 'Username is required.' });

    try {
        const existingUserWithName = await prisma.user.findUnique({
            where: { username: newUserName },
        });

        if (existingUserWithName)
            return response.status(409).send({ error: 'Username already in use.' });

        const modifiedUserRecord = await prisma.user.update({
            where: { id: currentUserId },
            data: { username: newUserName },
        });

        response.send({
            message: 'Username updated successfully.',
            username: modifiedUserRecord.username,
        });
    } catch (error) {
        console.error(error);
        response.status(500).send({ error: 'Failed to update username.' });
    }
};

export default {
    getCurrentUserProfile,
    uploadProfileImage,
    modifyProfileImage,
    createFriendship,
    retrieveFriendsList,
    fetchGameHistory,
    modifyUserName
};
