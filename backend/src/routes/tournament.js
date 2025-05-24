import tournamentController from '../controllers/tournamentController.js';

export default async function competitionRoutes(serverInstance) {
    serverInstance.post('/create', tournamentController.initializeCompetition);
    serverInstance.post('/:id/start', tournamentController.commenceCompetition);
    serverInstance.get('/:id/next-match', tournamentController.retrieveUpcomingMatch);
    serverInstance.patch('/:id/match/:mid/winner', tournamentController.recordMatchOutcome);
    serverInstance.get('/:id/bracket', tournamentController.retrieveCompetitionBracket);
}
