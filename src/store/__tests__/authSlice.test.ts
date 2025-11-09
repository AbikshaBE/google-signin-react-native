import authReducer, { clearError, setSession, type AuthState } from '../authSlice';

describe('authSlice reducer', () => {
  it('should return the initial state', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual<AuthState>({
      session: null,
      profile: null,
      status: 'idle',
      error: null,
    });
  });

  it('should handle setSession', () => {
    const session = { id: '123' } as any;
    const state = authReducer(undefined, setSession(session));
    expect(state.session).toEqual(session);
  });

  it('should handle clearError', () => {
    const initial: AuthState = {
      session: null,
      profile: null,
      status: 'error',
      error: 'oops',
    };
    const state = authReducer(initial, clearError());
    expect(state.error).toBeNull();
    expect(state.status).toEqual('error');
  });
});

