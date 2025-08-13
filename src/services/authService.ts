import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  deleteUser,
  getAuth
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  Timestamp,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User as AppUser } from '../types';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  establishmentName: string;
}

// Vérifier si un email est un email de démonstration
const isDemoEmail = (email: string): boolean => {
  const demoEmails = [
    'superadmin@saaspos.mg',
    'admin@saaspos.mg',
    'manager@saaspos.mg',
    'cashier@saaspos.mg',
    'reader@saaspos.mg'
  ];
  return demoEmails.includes(email.toLowerCase());
};

// Vérifier si un établissement est un établissement de démonstration
const isDemoEstablishment = (establishmentId: string): boolean => {
  return establishmentId === 'demo-establishment-main';
};

// Vérifier si un email est un email de Super Admin
const isSuperAdminEmail = (email: string): boolean => {
  return email.toLowerCase() === 'superadmin@saaspos.mg';
};

// Créer un document utilisateur par défaut si il n'existe pas
const createDefaultUserDocument = async (firebaseUser: User): Promise<AppUser> => {
  console.log('🔧 Création d\'un document utilisateur par défaut pour:', firebaseUser.uid);
  
  // Déterminer le rôle et les permissions basés sur l'email
  const email = firebaseUser.email || '';
  let role: 'superadmin' | 'admin' | 'manager' | 'cashier' | 'reader' = 'reader';
  let isSuperAdmin = false;
  let isSystemAdmin = false;
  let isClientAdmin = false;
  let establishmentId = '';

  // Configuration des comptes de démonstration
  if (email === 'superadmin@saaspos.mg') {
    role = 'superadmin';
    isSuperAdmin = true;
    isSystemAdmin = true;
    establishmentId = 'SYSTEM_ADMIN'; // Établissement système
  } else if (email === 'admin@saaspos.mg') {
    role = 'admin';
    isClientAdmin = true;
    establishmentId = 'demo-establishment-main';
  } else if (email === 'manager@saaspos.mg') {
    role = 'manager';
    establishmentId = 'demo-establishment-main';
  } else if (email === 'cashier@saaspos.mg') {
    role = 'cashier';
    establishmentId = 'demo-establishment-main';
  } else if (email === 'reader@saaspos.mg') {
    role = 'reader';
    establishmentId = 'demo-establishment-main';
  } else {
    // Pour les nouveaux utilisateurs non-démo, créer un admin client
    role = 'admin';
    isClientAdmin = true;
    establishmentId = `establishment_${firebaseUser.uid}`;
  }

  const userData = {
    id: firebaseUser.uid,
    email: email,
    name: firebaseUser.displayName || email.split('@')[0],
    role: role,
    establishmentId: establishmentId,
    isActive: true,
    isSuperAdmin: isSuperAdmin,
    isSystemAdmin: isSystemAdmin,
    isClientAdmin: isClientAdmin,
    lastLogin: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  try {
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    console.log('✅ Document utilisateur créé avec succès:', firebaseUser.uid);
  } catch (error) {
    console.error('❌ Erreur lors de la création du document utilisateur:', error);
    throw new Error('Impossible de créer le profil utilisateur');
  }

  const appUser: AppUser = {
    id: firebaseUser.uid,
    email: email,
    name: userData.name,
    role: role,
    establishmentId: establishmentId,
    isActive: true,
    isSuperAdmin: isSuperAdmin,
    isSystemAdmin: isSystemAdmin,
    isClientAdmin: isClientAdmin,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return appUser;
};

// Récupérer un utilisateur par son ID
const getUserById = async (uid: string): Promise<AppUser | null> => {
  try {
    console.log('🔍 Récupération des données utilisateur pour:', uid);
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.log('ℹ️ Données utilisateur non trouvées dans Firestore pour:', uid);
      return null;
    }

    const userData = userDoc.data();
    const appUser: AppUser = {
      id: uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      establishmentId: userData.establishmentId,
      isActive: userData.isActive ?? true,
      lastLogin: userData.lastLogin?.toDate() || null,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      // Nouveaux champs pour distinguer les types d'admin
      isSuperAdmin: userData.isSuperAdmin || false,
      isSystemAdmin: userData.isSystemAdmin || false,
      isClientAdmin: userData.isClientAdmin || false
    };
    
    console.log('✅ Données utilisateur récupérées:', uid, {
      role: appUser.role,
      isSystemAdmin: appUser.isSystemAdmin,
      establishmentId: appUser.establishmentId
    });
    return appUser;
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des données utilisateur:', error);
    return null;
  }
};

// Connexion utilisateur
const signIn = async (email: string, password: string): Promise<AppUser> => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth n\'est pas initialisé');
    }
    
    console.log('🔑 Tentative de connexion pour:', email);
    
    // Utiliser la persistence de session pour éviter les problèmes de cache
    await setPersistence(auth, browserSessionPersistence);
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    if (!result.user) {
      throw new Error('Aucun utilisateur retourné');
    }
    
    // Essayer de récupérer les données utilisateur existantes
    let appUser = await getUserById(result.user.uid);
    
    // Si aucun document utilisateur n'existe, en créer un par défaut
    if (!appUser) {
      console.log('🔧 Aucun document utilisateur trouvé, création d\'un document par défaut...');
      appUser = await createDefaultUserDocument(result.user);
    }
    
    // Mettre à jour la dernière connexion
    try {
      await setDoc(doc(db, 'users', result.user.uid), {
        lastLogin: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (updateError) {
      console.warn('⚠️ Impossible de mettre à jour la dernière connexion:', updateError);
      // Ne pas faire échouer la connexion pour cette erreur
    }
    
    console.log('✅ Connexion réussie:', result.user.uid, {
      role: appUser.role,
      isSystemAdmin: appUser.isSystemAdmin,
      establishmentId: appUser.establishmentId
    });
    return appUser;
  } catch (error: any) {
    console.error('❌ Erreur lors de la connexion:', error);
    
    // Check both error.code and error.message for better error handling
    const errorCode = error.code;
    const errorMessage = error.message || '';
    
    let customMessage: string;
    
    if (errorCode === 'auth/invalid-credential' || errorMessage.includes('auth/invalid-credential')) {
      customMessage = 'Email ou mot de passe incorrect';
    } else {
      switch (errorCode) {
        case 'auth/user-not-found':
          customMessage = 'Cet email n\'est pas enregistré. Créez d\'abord un compte.';
          break;
        case 'auth/wrong-password':
          customMessage = 'Mot de passe incorrect.';
          break;
        case 'auth/invalid-email':
          customMessage = 'Format d\'email invalide.';
          break;
        case 'auth/user-disabled':
          customMessage = 'Ce compte a été désactivé.';
          break;
        case 'auth/too-many-requests':
          customMessage = 'Trop de tentatives. Veuillez réessayez plus tard.';
          break;
        case 'auth/network-request-failed':
          customMessage = 'Problème de connexion réseau.';
          break;
        default:
          // Check if the error message contains common Firebase error patterns
          if (errorMessage.includes('invalid-credential') || errorMessage.includes('wrong-password') || errorMessage.includes('user-not-found')) {
            customMessage = 'Email ou mot de passe incorrect';
          } else {
            customMessage = `Erreur de connexion: ${error.message}`;
          }
          break;
      }
    }
    
    // Throw a new Error object with the custom message
    throw new Error(customMessage);
  }
};

// Inscription utilisateur
const signUp = async (signUpData: SignUpData): Promise<AppUser> => {
  try {
    console.log('📝 Tentative d\'inscription pour:', signUpData.email);
    
    // Vérifier si l'email est un email de démonstration
    if (isDemoEmail(signUpData.email)) {
      throw new Error('Cet email est réservé pour la démonstration. Veuillez utiliser une autre adresse email.');
    }
    
    // Vérifier si l'email est un email de Super Admin
    if (isSuperAdminEmail(signUpData.email)) {
      throw new Error('Cet email est réservé pour l\'administration système. Veuillez utiliser une autre adresse email.');
    }
    
    // Créer l'utilisateur Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, signUpData.email, signUpData.password);
    
    if (!result.user) {
      throw new Error('Aucun utilisateur créé');
    }

    // Mettre à jour le profil Firebase Auth
    await updateProfile(result.user, {
      displayName: signUpData.name
    });

    // Créer l'établissement
    const establishmentId = `establishment_${Date.now()}`;
    const establishmentData = {
      id: establishmentId,
      name: signUpData.establishmentName,
      address: '',
      phone: '',
      email: signUpData.email,
      currency: 'MGA',
      taxRate: 20,
      authorizedUsers: [result.user.uid],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'establishments', establishmentId), establishmentData);

    // Créer le document utilisateur dans Firestore
    const userData = {
      id: result.user.uid,
      email: signUpData.email,
      name: signUpData.name,
      role: 'admin' as const, // Premier utilisateur = admin
      establishmentId: establishmentId,
      isActive: true,
      isSuperAdmin: false,
      isSystemAdmin: false, // Jamais un Super Admin système lors de l'inscription
      isClientAdmin: true, // Admin client normal
      lastLogin: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'users', result.user.uid), userData);

    // Créer les catégories par défaut
    const defaultCategories = [
      { id: 'beverages', name: 'Boissons', color: 'blue' },
      { id: 'food', name: 'Alimentation', color: 'green' },
      { id: 'household', name: 'Ménage', color: 'purple' },
      { id: 'electronics', name: 'Électronique', color: 'yellow' },
      { id: 'clothing', name: 'Vêtements', color: 'pink' },
      { id: 'health', name: 'Santé & Beauté', color: 'indigo' }
    ];

    for (const category of defaultCategories) {
      const categoryDoc = {
        ...category,
        establishmentId: establishmentId,
        createdAt: Timestamp.now()
      };
      await setDoc(doc(db, 'categories', `${establishmentId}_${category.id}`), categoryDoc);
    }

    const appUser: AppUser = {
      id: result.user.uid,
      email: signUpData.email,
      name: signUpData.name,
      role: 'admin',
      establishmentId: establishmentId,
      isActive: true,
      isSuperAdmin: false,
      isSystemAdmin: false,
      isClientAdmin: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('✅ Inscription réussie:', result.user.uid);
    return appUser;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    
    // Messages d'erreur en français
    let customMessage: string;
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        customMessage = 'Cet email est déjà utilisé.';
        break;
      case 'auth/weak-password':
        customMessage = 'Mot de passe trop faible (min 6 caractères).';
        break;
      case 'auth/invalid-email':
        customMessage = 'Format d\'email invalide.';
        break;
      case 'auth/operation-not-allowed':
        customMessage = 'Inscription par email/mot de passe non activée.';
        break;
      default:
        customMessage = error.message || `Erreur d'inscription`;
        break;
    }
    
    // Throw a new Error object with the custom message
    throw new Error(customMessage);
  }
};

// Déconnexion complète avec nettoyage du cache
const logout = async (): Promise<void> => {
  try {
    // Déconnexion de Firebase Auth
    await signOut(auth);
    
    // Vider le localStorage et sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Forcer le rechargement de la page pour nettoyer complètement le cache
    window.location.href = '/login';
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
};

// Supprimer complètement un utilisateur (Auth + Firestore)
const deleteUserCompletely = async (userId: string, userEmail: string): Promise<void> => {
  try {
    console.log('🗑️ Tentative de suppression complète de l\'utilisateur:', userId, userEmail);
    
    // Vérifier si c'est un compte de démonstration
    if (isDemoEmail(userEmail)) {
      throw new Error('Les comptes de démonstration ne peuvent pas être supprimés.');
    }
    
    // Vérifier si c'est un compte Super Admin
    if (isSuperAdminEmail(userEmail)) {
      throw new Error('Les comptes Super Admin système ne peuvent pas être supprimés par cette méthode.');
    }
    
    // 1. Supprimer le document Firestore
    await deleteDoc(doc(db, 'users', userId));
    console.log('✅ Document Firestore supprimé');
    
    // 2. Rechercher tous les utilisateurs Firebase Auth avec cet email
    // Note: Ceci n'est pas possible côté client, il faudrait une Cloud Function
    // Nous allons donc simplement informer l'utilisateur qu'il doit supprimer le compte dans la console Firebase
    
    console.log('⚠️ La suppression complète de Firebase Auth nécessite la console Firebase');
    
    // 3. Vérifier si l'utilisateur existe encore dans Firestore
    try {
      const q = query(collection(db, 'users'), where('email', '==', userEmail));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log('⚠️ Des documents utilisateur avec cet email existent encore:', snapshot.size);
        // Supprimer tous les documents trouvés
        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
          console.log('✅ Document supplémentaire supprimé:', doc.id);
        }
      }
    } catch (queryError) {
      console.error('❌ Erreur lors de la recherche de documents supplémentaires:', queryError);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression complète de l\'utilisateur:', error);
    throw error;
  }
};

// Obtenir l'utilisateur actuel
const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Observer les changements d'état d'authentification
const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Vérifier si l'utilisateur est connecté
const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Export par défaut d'un objet contenant toutes les fonctions
export const authService = {
  signIn,
  signUp,
  logout,
  getCurrentUser,
  onAuthStateChange,
  isAuthenticated,
  getUserById,
  deleteUserCompletely,
  isDemoEmail,
  isDemoEstablishment,
  isSuperAdminEmail
};

