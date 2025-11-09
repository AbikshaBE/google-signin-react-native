import { useAppSelector } from '@/src/hooks';
import { getSupabaseClient, SupabaseConfigurationError } from '@/src/services/supabaseClient';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const isConnected = useAppSelector((state) => state.network.isConnected);

  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null);
  const networkStatus = isOnline ?? isConnected ?? null;
  const isNetworkReady = networkStatus === null ? false : Boolean(networkStatus);
  const isPrimaryDisabled = !isNetworkReady || !supabase || Boolean(configError);
  useEffect(() => {
    let isMounted = true;

    try {
      const client = getSupabaseClient();
      if (isMounted) {
        setSupabase(client);
        setConfigError(null);
      }
    } catch (error) {
      if (!isMounted) {
        return;
      }

      if (error instanceof SupabaseConfigurationError) {
        setConfigError(error.message);
      } else {
        console.error('Failed to create Supabase client', error);
        setConfigError('Unexpected error while configuring Supabase.');
      }
      setSupabase(null);
    }

    return () => {
      isMounted = false;
    };
  }, []);


  // Deep link for Expo (uses scheme from app.json, e.g. my-app://auth/callback)
  const redirectTo = Linking.createURL('/auth/callback');


  const handlePrimaryPress = () => {
    if (!isNetworkReady) {
      Alert.alert('Offline', 'You appear to be offline. Please reconnect and try again.');
      return;
    }
    if (!supabase) {
      Alert.alert('Configuration error', configError ?? 'Supabase client not available.');
      return;
    }
    Alert.alert('Continue with Google?', 'We will redirect you to Google to finish signing in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => void handleGoogleSignIn() },
    ]);
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      Alert.alert('Configuration error', configError ?? 'Supabase client not available.');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('Google login error:', error.message);
        const normalizedMessage = error.message.toLowerCase();
        if (normalizedMessage.includes('provider is not enabled')) {
          Alert.alert(
            'Provider disabled',
            'Google sign-in is not enabled for this Supabase project. Enable Google OAuth in the Supabase dashboard (Authentication → Providers → Google).'
          );
        } else if (normalizedMessage.includes('unexpected failure')) {
          Alert.alert(
            'Supabase error',
            'Supabase returned an unexpected error. Check Auth → Logs in the Supabase dashboard for the detailed message.'
          );
        } else {
          Alert.alert('Login failed', error.message);
        }
        return;
      }

      console.log('🔗 Redirecting to Google login:', data?.url);
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'cancel') {
          console.log('Google login flow was cancelled by the user.');
        }
      } else {
        console.warn('Supabase did not return an OAuth URL.');
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      Alert.alert('Sign-In Failed', 'Something went wrong during Google login.');
    }
  };

  // Check session
  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const getSession = async () => {
      if (!isMounted) {
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/(app)/dashboard');
      }
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (session) {
        router.replace('/(app)/dashboard');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Network listener
  useEffect(() => {
    let isMounted = true;

    NetInfo.fetch().then((state) => {
      if (isMounted) {
        setIsOnline(Boolean(state.isConnected));
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (isMounted) {
        setIsOnline(Boolean(state.isConnected));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
      style={styles.container}
    >
      <View style={styles.backgroundAccentOne} pointerEvents="none" />
      <View style={styles.backgroundAccentTwo} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>
            Sign in to sync your tasks, pick up where you left off, and keep your team aligned.
          </Text>
        </View>
    
        <View style={styles.card}>
          <View style={styles.cardHeader}>
           
            <Text style={styles.cardTitle}>Use your Google account</Text>
           
          </View>

          <Pressable
            style={[styles.primaryButton, isPrimaryDisabled && styles.buttonDisabled]}
            onPress={handlePrimaryPress}
            disabled={isPrimaryDisabled}
          >
            <Text style={styles.primaryButtonText}>
              {!isNetworkReady
                ? 'Offline'
                : !supabase || configError
                ? 'Configuration issue'
                : 'Continue with Google'}
            </Text>
          </Pressable>

          {configError && <Text style={styles.errorMessage}>{configError}</Text>}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Need an account?</Text>
          <Link href="/(auth)/signup" style={styles.link}>
            Create one
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05091C',
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 88,
  },
  backgroundAccentOne: {
    position: 'absolute',
    top: -180,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#7C3AED',
    opacity: 0.22,
  },
  backgroundAccentTwo: {
    position: 'absolute',
    bottom: -160,
    left: -150,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1D4ED8',
    opacity: 0.18,
  },
  heroSection: {
    gap: 12,
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    maxWidth: 360,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 20 },
    elevation: 16,
    gap: 24,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    gap: 12,
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  badgeText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#CBD5F5',
    lineHeight: 20,
  },
  cardIllustration: {
    width: '100%',
    height: 160,
  },
  primaryButton: {
    backgroundColor: '#4285F4',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5A5FF',
  },
  errorMessage: {
    fontSize: 13,
    color: '#FCA5A5',
    lineHeight: 18,
  },
});
