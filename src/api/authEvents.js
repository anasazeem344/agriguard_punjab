// A tiny pub-sub so axiosClient (outside the React tree) can signal "the
// session is no longer valid" and have a component inside the Router/Auth
// context react to it (clear auth state, redirect to /login).
export const authEvents = new EventTarget();

export const emitUnauthorized = () => {
  authEvents.dispatchEvent(new Event('unauthorized'));
};
