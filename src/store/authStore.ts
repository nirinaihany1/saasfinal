import { create } from 'zustand';
import type { User } from '../types';
import { authService, SignUpData } from '../services/authService';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (signUpData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isInitialized: false,

  signIn: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(credentials.email, credentials.password);
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Erreur de connexion', 
        isLoading: false 
      });
      throw error;
    }
  },

  signUp: async (signUpData: SignUpData) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(signUpData);
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Erreur d\'inscription', 
        isLoading: false 
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, isLoading: false });
      // La redirection est gérée dans la fonction logout
    } catch (error: any) {
      set({ 
        error: error.message || 'Erreur de déconnexion', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setUser: (user: User | null) => set({ user }),

  initialize: () => {
    if (get().isInitialized) return;

    set({ isInitialized: true });

    // Subscribe to auth state changes
    authService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Use the getUserById function
          const user = await authService.getUserById(firebaseUser.uid);
          
          if (user === null) {
            // User document doesn't exist yet (e.g., during setup process)
            console.log('ℹ️ Données utilisateur en cours de création...');
            set({ user: null, isLoading: false, error: null });
          } else {
            // User document exists, set the user
            set({ user, isLoading: false, error: null });
          }
        } catch (error: any) {
          console.error('❌ Erreur lors de la récupération des données utilisateur:', error);
          set({ user: null, isLoading: false, error: null });
        }
      } else {
        set({ user: null, isLoading: false, error: null });
      }
    });
  }
}));