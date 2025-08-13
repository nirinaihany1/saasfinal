import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuration de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBS9dLh1WJEpeMpqqday6I4ptNelQVvmrs",
  authDomain: "saas-915ec.firebaseapp.com",
  projectId: "saas-915ec",
  storageBucket: "saas-915ec.appspot.com",
  messagingSenderId: "1029638100897",
  appId: "1:1029638100897:web:acb7e6fe5453e0872b5de0"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Exporter les services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Configurer la persistance de l'authentification
auth.useDeviceLanguage();

// Exporter l'application Firebase
