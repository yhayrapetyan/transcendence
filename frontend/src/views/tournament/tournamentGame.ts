import { render as renderGame } from '../game/index';
import { retrieveSessionData } from '../../utils/cookies';
import { establishMatchWebSocketConnection, terminateWebSocketConnection } from '../../utils/socket';

export async function renderTournamentGamePage(root: HTMLElement, tournamentId: string) {
    root.innerHTML = '';
    
    const token = retrieveSessionData('token');
    if (!token) throw new Error('No token found');
    
    const res = await fetch(`/api/tournament/${tournamentId}/next-match`);
    const { match, participants } = await res.json();

    console.log('Match:', match);
    console.log('Participants:', participants);

    if (!match || match.message === 'No pending matches') {
        root.innerHTML = `<div class="text-2xl text-white text-center mt-10">Турнир завершён!</div>`;
        return;
    }

    establishMatchWebSocketConnection(token, match.id);

    window.addEventListener('beforeunload', () => {
        terminateWebSocketConnection();
    });
    
    let role: 'player1' | 'player2' | 'spectator' = 'spectator';
    if (match && match.player1 && match.player2) {
        const userId = JSON.parse(atob(token.split('.')[1])).id;
        if (match.player1Id === userId) role = 'player1';
        else if (match.player2Id === userId) role = 'player2';
    }

    renderGame(root, {role, match, participants});
}