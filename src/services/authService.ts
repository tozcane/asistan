import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import type { UserProfile } from '../types';

const DEMO_USER_KEY = 'structured_demo_user';

function mapFirebaseUser(user: FirebaseUser): UserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

export async function loginWithGoogle(): Promise<UserProfile> {
  if (isFirebaseConfigured && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return mapFirebaseUser(result.user);
    } catch (error: any) {
      console.error('Google Giriş Hatası:', error);
      throw error;
    }
  }

  // Demo / Simülasyon Modu (Firebase .env henüz eklenmemişse)
  const mockUser: UserProfile = {
    uid: 'google_user_' + Date.now().toString(36),
    displayName: 'Google Kullanıcısı',
    email: 'kullanici@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    isAnonymous: false,
  };

  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(mockUser));
  window.dispatchEvent(new CustomEvent('structured_auth_change', { detail: mockUser }));
  return mockUser;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Çıkış Hatası:', error);
    }
  }

  localStorage.removeItem(DEMO_USER_KEY);
  window.dispatchEvent(new CustomEvent('structured_auth_change', { detail: null }));
}

export function subscribeToAuthChanges(
  onUserChanged: (user: UserProfile | null) => void
): () => void {
  if (isFirebaseConfigured && auth) {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      onUserChanged(user ? mapFirebaseUser(user) : null);
    });
    return unsubscribe;
  }

  // Demo Modu için dinleyici
  const saved = localStorage.getItem(DEMO_USER_KEY);
  if (saved) {
    try {
      onUserChanged(JSON.parse(saved));
    } catch {
      onUserChanged(null);
    }
  } else {
    onUserChanged(null);
  }

  const handleCustomAuth = (e: Event) => {
    const customEvent = e as CustomEvent<UserProfile | null>;
    onUserChanged(customEvent.detail);
  };

  window.addEventListener('structured_auth_change', handleCustomAuth);
  return () => {
    window.removeEventListener('structured_auth_change', handleCustomAuth);
  };
}
