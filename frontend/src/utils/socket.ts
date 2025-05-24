let webSocketConnection: WebSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval>;

export function establishWebSocketConnection(authToken: string): void {
  if (webSocketConnection) {
    return;
  }

  const websocketUrl = `wss://${window.location.hostname}/api/ws`;
  webSocketConnection = new WebSocket(websocketUrl, authToken);

  configureSocketEventHandlers();
}

export function establishMatchWebSocketConnection(authToken: string, gameMatchId: number): void {
  
  const websocketUrl = `wss://${window.location.hostname}/api/ws/match/${gameMatchId}`;
  webSocketConnection = new WebSocket(websocketUrl, authToken);

  configureSocketEventHandlers();
}

function configureSocketEventHandlers() {
  if (!webSocketConnection) return;

  webSocketConnection.onopen = () => {
    heartbeatInterval = setInterval(() => {
      if (webSocketConnection?.readyState === WebSocket.OPEN) {
        webSocketConnection.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000); 
  };

  webSocketConnection.onerror = () => {
  };
  
  webSocketConnection.onclose = () => {
    clearInterval(heartbeatInterval);
    webSocketConnection = null;
  };

  webSocketConnection.onmessage = (messageEvent) => {
    try {
      const messageData = JSON.parse(messageEvent.data);
      if (messageData.type === 'pong') return;
      else if (messageData.type === 'paddle_move') {
        const { role, z } = messageData;
        const customEvent = new CustomEvent('paddle_move', { detail: { role, z } });
        window.dispatchEvent(customEvent);
      } else if (messageData.type === 'ball_update') {
        const { position, direction } = messageData;
        const customEvent = new CustomEvent('ball_update', { detail: { position, direction } });
        window.dispatchEvent(customEvent);
      } else if (messageData.type === 'tournament_started' && messageData.redirectTo) {
        window.location.href = messageData.redirectTo;
      } else if (messageData.type === 'redirect') {
        const { url } = messageData;
        window.location.href = url;
      } else if (messageData.type === 'goal') {
        const customEvent = new CustomEvent('goal', { detail: { scorer: messageData.scorer, scores: messageData.scores } });
        window.dispatchEvent(customEvent);
      } else if (messageData.type === 'score_update') {
        const customEvent = new CustomEvent('score_update', { detail: { scores: messageData.scores } });
        window.dispatchEvent(customEvent);
      } else if (messageData.type === 'paddle_positions') {
        const customEvent = new CustomEvent('paddle_positions', { detail: { paddle1z: messageData.paddle1z, paddle2z: messageData.paddle2z } });
        window.dispatchEvent(customEvent);
      }
    } catch (error) { }
  };
}

export function terminateWebSocketConnection(): void {
  if (webSocketConnection) {
    webSocketConnection.close();
    webSocketConnection = null;
  }
}

export function getWebSocketInstance(): WebSocket | null {
  return webSocketConnection;
}