import { useAppDispatch, useAppSelector } from '@/src/hooks';
import { clearError, signUpWithEmail } from '@/src/store/authSlice';
import type { UserRole } from '@/src/types';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const roles: { label: string; value: UserRole; description: string }[] = [
  { label: 'Admin', value: 'admin', description: 'Can create, assign, and delete tasks.' },
  { label: 'Member', value: 'member', description: 'Can view tasks and update progress.' },
];

export default function SignupScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Email and password are required.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    if (passwordStrength < 3) {
      Alert.alert('Weak password', 'Use at least 8 characters with numbers and symbols.');
      return;
    }

    const result = await dispatch(
      signUpWithEmail({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role,
      })
    );

    if (signUpWithEmail.fulfilled.match(result)) {
      router.replace('/(app)/dashboard');
    }
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Sign up failed', error, [{ text: 'OK', onPress: () => dispatch(clearError()) }]);
    }
  }, [error, dispatch]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      <View style={styles.backgroundAccentOne} pointerEvents="none" />
      <View style={styles.backgroundAccentTwo} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
        
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSubtitle}>
            Invite teammates, assign roles, and orchestrate your backlog from one polished workspace.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldSet}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              placeholder="Taylor Swift"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              textContentType="name"
            />
          </View>

          <View style={styles.fieldSet}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.fieldSet}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            <Text style={styles.helper}>
              Strength: {['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'][passwordStrength]}
            </Text>
          </View>

          <View style={styles.fieldSet}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="password"
            />
          </View>

          <View style={styles.fieldSet}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {roles.map((item) => {
                const selected = item.value === role;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRole(item.value)}
                    style={[styles.rolePill, selected && styles.rolePillSelected]}
                  >
                    <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{item.label}</Text>
                    <Text style={[styles.roleDescription, selected && styles.roleDescriptionSelected]}>
                      {item.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, status === 'loading' && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={status === 'loading'}
          >
            <Text style={styles.primaryButtonText}>{status === 'loading' ? 'Creating…' : 'Create account'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
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
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 88,
  },
  heroSection: {
    gap: 12,
    marginBottom: 24,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.35)',
    backgroundColor: 'rgba(236, 72, 153, 0.18)',
  },
  heroBadgeText: {
    color: '#F9A8D4',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
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
  formCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  fieldSet: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.38)',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F8FAFC',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: '#A5B4FC',
  },
  roleRow: {
    flexDirection: 'column',
    gap: 12,
  },
  rolePill: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  rolePillSelected: {
    borderColor: 'rgba(124, 58, 237, 0.75)',
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  roleTextSelected: {
    color: '#FBCFE8',
  },
  roleDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#94A3B8',
  },
  roleDescriptionSelected: {
    color: '#E9D5FF',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
});

