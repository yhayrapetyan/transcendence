import userController from '../controllers/userController.js';

async function userDataRoutes(serverInstance, options) {
    serverInstance.get('/me', {
        preValidation: [serverInstance.authenticate],
        handler: userController.getCurrentUserProfile
    });

    serverInstance.patch('/avatar', {
        preValidation: [serverInstance.authenticate],
        handler: userController.modifyProfileImage,
    });

    serverInstance.post('/avatar', {
        preValidation: [serverInstance.authenticate],
        handler: userController.uploadProfileImage,
    });

    serverInstance.post('/friends/:friendId', {
        preValidation: [serverInstance.authenticate],
        handler: userController.createFriendship,
    });

    serverInstance.get('/friends', {
        preValidation: [serverInstance.authenticate],
        handler: userController.retrieveFriendsList,
    });

    serverInstance.get('/history', {
        preValidation: [serverInstance.authenticate],
        handler: userController.fetchGameHistory,
    });

    serverInstance.patch('/username', {
        preValidation: [serverInstance.authenticate],
        handler: userController.modifyUserName,
    });
}

export default userDataRoutes;
