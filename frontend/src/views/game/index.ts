import { createPongScene } from './createScene';
import { createNavbar } from '../../components/navbars';
import { createMatchInfo } from './matchInfo';
import { showNotification } from '../../components/notification';

export async function render(
    root: HTMLElement,
    options?: { role: string, match: any, participants: any[], tournamentId?: string }
) {
    root.innerHTML = '';

    let scores = { player1: 0, player2: 0 };
    const matchInfo = createMatchInfo(options?.match, scores);
    root.appendChild(matchInfo);

    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.className = 'w-screen h-screen';
    root.appendChild(canvas);

    const controls = document.createElement('div');
    controls.className = `
        fixed bottom-4 left-24 w-full flex justify-center gap-8 z-[1001]
        sm:hidden
    `;
    controls.innerHTML = `
      <button id="btn-up" class="bg-gray-800 text-white rounded-full w-16 h-16 text-3xl shadow-lg active:bg-gray-600">▲</button>
      <button id="btn-down" class="bg-gray-800 text-white rounded-full w-16 h-16 text-3xl shadow-lg active:bg-gray-600">▼</button>
    `;
    root.appendChild(controls);

    const btnUp = controls.querySelector('#btn-up') as HTMLButtonElement;
    const btnDown = controls.querySelector('#btn-down') as HTMLButtonElement;

    btnUp.addEventListener('touchstart', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });
    btnUp.addEventListener('touchend', () => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
    });
    btnDown.addEventListener('touchstart', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    btnDown.addEventListener('touchend', () => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown' }));
    });

    createPongScene(canvas, options);

    const navbar = await createNavbar();
    if (navbar) {
        root.appendChild(navbar);
    }
    const userIds: number[] = Array.isArray(options?.participants)
        ? options.participants.map(p => Number(p.id))
        : [];

    console.log('User IDs:', userIds);
    window.addEventListener('goal', (e: any) => {
        const scores = e.detail.scores;
        matchInfo.querySelector('#score-p1')!.textContent = scores.player1.toString();
        matchInfo.querySelector('#score-p2')!.textContent = scores.player2.toString();

        if (scores.player1 >= 5 || scores.player2 >= 5) {
            window.dispatchEvent(new CustomEvent('stop_ball'));

            const winnerId = scores.player1 >= 5 ? options?.match.player1Id : options?.match.player2Id;
            const winnerRole = scores.player1 >= 5 ? 'player1' : 'player2';
            const tournamentId = options?.match.tournamentId;
            const matchId = options?.match.id;

            if (options?.role === winnerRole && tournamentId && matchId) {
                fetch(`/api/tournament/${tournamentId}/match/${matchId}/winner`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ winnerId }),
                }).then(async res => {
                    const data = await res.json();
                    if (data.message === 'Tournament finished!') {
                        showNotification('Tournament finished!', 'info');
                        await fetch(`/api/ws/tournament/redirect`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                userIds: userIds,
                                url: `/profile` 
                            }),
                        });
                        window.location.href = '/profile';
                    } else {
                        await fetch(`/api/ws/tournament/redirect`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                userIds: userIds,
                                url: `/tournament/game/${tournamentId}` 
                            }),
                        });
                    }
                });
            }
        }
    });

    window.addEventListener('score_update', (e: any) => {
        const scores = e.detail.scores;
        matchInfo.querySelector('#score-p1')!.textContent = scores.player1.toString();
        matchInfo.querySelector('#score-p2')!.textContent = scores.player2.toString();
    });
}
