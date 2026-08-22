export interface SessionIsolationActions {
  disconnectSocket: () => void;
  resetTripState: () => void;
  resetDriverState: () => void;
}

export interface AuthenticatedSessionActions extends SessionIsolationActions {
  connectSocket: () => void;
}

export function clearSessionBoundState(actions: SessionIsolationActions): void {
  actions.disconnectSocket();
  actions.resetTripState();
  actions.resetDriverState();
}

export function startAuthenticatedSession(actions: AuthenticatedSessionActions): void {
  clearSessionBoundState(actions);
  actions.connectSocket();
}
