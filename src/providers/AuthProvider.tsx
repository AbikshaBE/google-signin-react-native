import { useEffect, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { useAppDispatch, useAppSelector } from '../hooks';
import { refreshSession, setSession } from '../store/authSlice';

export function AuthProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const session = useAppSelector((state) => state.auth.session);
  const isConnected = useAppSelector((state) => state.network.isConnected);

  useEffect(() => {
    if (!isSupabaseConfigured || isConnected !== true) {
      return;
    }

    let isMounted = true;
    const supabase = getSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted && data.session) {
          dispatch(refreshSession(data.session));
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.warn('Supabase session fetch failed', error);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      dispatch(setSession(session));
      if (session) {
        dispatch(refreshSession(session));
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [dispatch, isConnected]);

  if (status === 'loading' && !session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return children;
}

