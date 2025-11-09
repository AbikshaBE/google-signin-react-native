import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabaseClient';
import type { Profile, UserRole } from '../types';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  profile: null,
  status: 'idle',
  error: null,
};

type Credentials = {
  email: string;
  password: string;
};

interface SignUpPayload extends Credentials {
  fullName?: string;
  role: UserRole;
  username?: string;
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

async function fetchProfile(client: SupabaseClient, userId: string, email?: string): Promise<Profile> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      email: email ?? '',
      role: data.role as UserRole,
      username: data.username,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    throw new Error(resolveErrorMessage(error, 'Failed to load profile'));
  }
}

export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }: Credentials, { rejectWithValue }) => {
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Supabase misconfigured');
    }

    let data;
    let error;
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      data = response.data;
      error = response.error;
    } catch (err) {
      return rejectWithValue(resolveErrorMessage(err, 'Network request failed'));
    }

    if (error) {
      return rejectWithValue(error.message);
    }

    if (!data.session) {
      return rejectWithValue('No session returned from Supabase');
    }

    const profile = await fetchProfile(supabase, data.session.user.id, data.session.user.email);

    return { session: data.session, profile };
  }
);

function deriveUsername(email: string, fullName?: string | null): string {
  if (fullName && fullName.trim().length > 0) {
    return fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }
  return email.split('@')[0] ?? 'user';
}

export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async ({ email, password, fullName, role, username }: SignUpPayload, { rejectWithValue }) => {
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Supabase misconfigured');
    }

    let data;
    let error;
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      data = response.data;
      error = response.error;
    } catch (err) {
      return rejectWithValue(resolveErrorMessage(err, 'Network request failed'));
    }

    if (error) {
      return rejectWithValue(error.message);
    }

    if (!data.user) {
      return rejectWithValue('No user returned from Supabase');
    }

    const profilePayload = {
      id: data.user.id,
      email: data.user.email,
      username: username ?? deriveUsername(email, fullName),
      role,
      full_name: fullName ?? null,
    };

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        return rejectWithValue(profileError.message);
      }
    } catch (err) {
      return rejectWithValue(resolveErrorMessage(err, 'Network request failed'));
    }

    if (!data.session) {
      let sessionData;
      let sessionError;
      try {
        const response = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        sessionData = response.data;
        sessionError = response.error;
      } catch (err) {
        return rejectWithValue(resolveErrorMessage(err, 'Network request failed'));
      }

      if (sessionError) {
        return rejectWithValue(sessionError.message);
      }

      if (!sessionData.session) {
        return rejectWithValue('Unable to establish session after sign up');
      }

      const profile = await fetchProfile(
        supabase,
        sessionData.session.user.id,
        sessionData.session.user.email
      );
      return { session: sessionData.session, profile };
    }

    const profile = await fetchProfile(supabase, data.session.user.id, data.session.user.email);
    return { session: data.session, profile };
  }
);

export const signOut = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  try {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return rejectWithValue(error.message);
      }
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, 'Network request failed'));
    }
    return true;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Supabase misconfigured');
  }
});

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (session: Session, { rejectWithValue }) => {
    try {
      const supabase = getSupabaseClient();
      const profile = await fetchProfile(supabase, session.user.id, session.user.email);
      return { session, profile };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.session = action.payload.session;
        state.profile = action.payload.profile;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(signUpWithEmail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.session = action.payload.session;
        state.profile = action.payload.profile;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.status = 'idle';
        state.session = null;
        state.profile = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.profile = action.payload.profile;
        state.status = 'authenticated';
      })
      .addCase(refreshSession.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { setSession, clearError } = authSlice.actions;

export default authSlice.reducer;

