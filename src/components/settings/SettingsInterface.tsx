import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  Settings, 
  Store, 
  Users, 
  Printer, 
  Database,
  Shield,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Upload,
  Download,
  Save,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Info,
  Lock,
  Mail
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { DataResetManager } from './DataResetManager';
import { EmailManagement } from './EmailManagement';
import { SystemAdminManager } from './SystemAdminManager';
import { SuperAdminCleanup } from './SuperAdminCleanup';
import { AdminListManager } from './AdminListManager';
import { AllUsersList } from '../admin/AllUsersList';
import { EmailJSConfig } from '../ui/EmailJSConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  getAuth
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { User } from '../../types';
import toast from 'react-hot-toast';

interface NewUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier' | 'reader';
  isActive: boolean;
}

export const SettingsInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  
  const { user: currentUser, signOut: storeSignOut } = useAuthStore();
  
  const [establishmentSettings, setEstablishmentSettings] = useState({
    name: 'Nirina Nirina Pos Madagascar',
    address: 'Antananarivo, Madagascar',
    phone: '+261 34 12 345 67',
    email: 'contact@saaspos.mg',
    nif: '1234567890',
    stat: '12345678901234',
    currency: 'MGA',
    taxRate: 20,
    logo: ''
  });

  const [posSettings, setPosSettings] = useState({
    autoOpenDrawer: true,
    autoPrintReceipt: false,
    defaultPaymentMethod: 'cash',
    receiptFooter: 'Merci de votre visite !',
    lowStockAlert: 10,
    enableLoyalty: true
  });

  const [newUser, setNewUser] = useState<NewUserData>({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    isActive: true
  });

  const tabs = [
    { id: 'general', label: 'Général', icon: Store },
    { id: 'pos', label: 'Point de Vente', icon: CreditCard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'emails', label: 'Emails', icon: Globe },
    { id: 'emailjs', label: 'Config EmailJS', icon: Mail },
    { id: 'data', label: 'Données', icon: Database },
    { id: 'printer', label: 'Impression', icon: Printer },
    { id: 'backup', label: 'Sauvegarde', icon: Database },
    { id: 'security', label: 'Sécurité', icon: Shield }
  ];

  // Ajouter l'onglet Admin Système uniquement pour les Super Admins
  if (currentUser?.isSystemAdmin) {
    tabs.push({ id: 'system-admin', label: 'Admin Système', icon: Shield });
    tabs.push({ id: 'admin-list', label: 'Liste Admins', icon: Users });
    tabs.push({ id: 'all-users', label: 'Tous les utilisateurs', icon: Users });
  }

  const roles = [
    { id: 'admin', name: 'Administrateur', description: 'Accès complet au système' },
    { id: 'manager', name: 'Gérant', description: 'Gestion de l\'établissement' },
    { id: 'cashier', name: 'Caissier', description: 'Ventes et caisse uniquement' },
    { id: 'reader', name: 'Lecteur', description: 'Consultation seule' }
  ];

  // Charger les utilisateurs depuis Firestore
  const loadUsers = async () => {
    if (!currentUser?.establishmentId) return;
    
    try {
      setLoadingUsers(true);
      const q = query(
        collection(db, 'users'),
        where('establishmentId', '==', currentUser.establishmentId)
      );
      
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
          establishmentId: data.establishmentId,
          isActive: data.isActive ?? true,
          isSuperAdmin: data.isSuperAdmin ?? false,
          isSystemAdmin: data.isSystemAdmin ?? false,
          isClientAdmin: data.isClientAdmin ?? false,
          lastLogin: data.lastLogin?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as User;
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Charger les paramètres de l'établissement
  const loadEstablishmentSettings = async () => {
    if (!currentUser?.establishmentId) return;
    
    try {
      const estDoc = await getDoc(doc(db, 'establishments', currentUser.establishmentId));
      if (estDoc.exists()) {
        const data = estDoc.data();
        setEstablishmentSettings({
          name: data.name || 'Nirina Nirina Pos Madagascar',
          address: data.address || 'Antananarivo, Madagascar',
          phone: data.phone || '+261 34 12 345 67',
          email: data.email || 'contact@saaspos.mg',
          nif: data.nif || '1234567890',
          stat: data.stat || '12345678901234',
          currency: data.currency || 'MGA',
          taxRate: data.taxRate || 20,
          logo: data.logo || ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  // Charger les paramètres POS
  const loadPOSSettings = async () => {
    if (!currentUser?.establishmentId) return;
    
    try {
      const posDoc = await getDoc(doc(db, 'pos_settings', currentUser.establishmentId));
      if (posDoc.exists()) {
        const data = posDoc.data();
        setPosSettings({
          autoOpenDrawer: data.autoOpenDrawer ?? true,
          autoPrintReceipt: data.autoPrintReceipt ?? false,
          defaultPaymentMethod: data.defaultPaymentMethod || 'cash',
          receiptFooter: data.receiptFooter || 'Merci de votre visite !',
          lowStockAlert: data.lowStockAlert || 10,
          enableLoyalty: data.enableLoyalty ?? true
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres POS:', error);
    }
  };
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'emails') {
      loadUsers();
    }
    if (activeTab === 'general') {
      loadEstablishmentSettings();
    }
    if (activeTab === 'pos') {
      loadPOSSettings();
    }
  }, [activeTab, currentUser?.establishmentId]);

  const handleSaveEstablishment = () => {
    if (!currentUser?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    setIsLoading(true);
    
    // Sauvegarder dans Firestore
    setDoc(doc(db, 'establishments', currentUser.establishmentId), {
      name: establishmentSettings.name,
      address: establishmentSettings.address,
      phone: establishmentSettings.phone,
      email: establishmentSettings.email,
      nif: establishmentSettings.nif,
      stat: establishmentSettings.stat,
      currency: establishmentSettings.currency,
      taxRate: establishmentSettings.taxRate,
      updatedAt: Timestamp.now()
    }, { merge: true }).then(() => {
      toast.success('Paramètres de l\'établissement sauvegardés avec succès');
      setIsLoading(false);
    }).catch((error) => {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
      setIsLoading(false);
    });
  };

  const handleSavePOS = () => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    setIsLoading(true);
    
    // Sauvegarder dans Firestore (dans une collection séparée pour les paramètres POS)
    setDoc(doc(db, 'pos_settings', user.establishmentId), {
      ...posSettings,
      establishmentId: user.establishmentId,
      updatedAt: Timestamp.now()
    }).then(() => {
      toast.success('Paramètres POS sauvegardés avec succès');
      setIsLoading(false);
    }).catch((error) => {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres POS');
      setIsLoading(false);
    });
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Tous les champs sont requis');
      return;
    }

    if (!currentUser?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    if (currentUser.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent ajouter des utilisateurs');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (authService.isDemoEmail(currentUser.email)) {
      toast.error('Les comptes de démonstration ne peuvent pas créer de nouveaux utilisateurs');
      return;
    }

    // Vérifier si l'email est un email de Super Admin
    if (authService.isSuperAdminEmail(newUser.email)) {
      toast.error('Cet email est réservé pour l\'administration système. Veuillez utiliser une autre adresse email.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newUser.email, 
        newUser.password
      );

      // Mettre à jour le profil Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: newUser.name
      });

      // Créer le document utilisateur dans Firestore
      const userData = {
        id: userCredential.user.uid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        establishmentId: currentUser.establishmentId,
        isActive: newUser.isActive,
        isSuperAdmin: false,
        isSystemAdmin: false, // Jamais un Super Admin système lors de l'ajout par un utilisateur
        isClientAdmin: newUser.role === 'admin',
        lastLogin: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Recharger la liste des utilisateurs
      await loadUsers();
      
      // Réinitialiser le formulaire
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'cashier', 
        isActive: true 
      });
      setShowUserForm(false);
      
      toast.success('Utilisateur ajouté avec succès');
    } catch (error: any) {
      // Gestion des erreurs avec messages utilisateur appropriés
      let errorMessage = 'Erreur lors de l\'ajout de l\'utilisateur';
      
      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Cette adresse email est déjà utilisée';
            break;
          case 'auth/weak-password':
            errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Format d\'email invalide';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Création de compte désactivée';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
            break;
          default:
            errorMessage = `Erreur Firebase: ${error.code}`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Afficher uniquement le message d'erreur utilisateur
      toast.error(errorMessage);
      
      // Log technique pour le débogage (ne s'affiche que dans la console)
      console.error('Détails de l\'erreur d\'ajout d\'utilisateur:', {
        code: error?.code,
        message: error?.message,
        email: newUser.email
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent modifier les utilisateurs');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (authService.isDemoEmail(currentUser.email)) {
      toast.error('Les comptes de démonstration ne peuvent pas modifier d\'autres utilisateurs');
      return;
    }
    
    // Vérifier si on essaie de modifier un compte Super Admin
    if (user.isSystemAdmin) {
      toast.error('Les comptes Super Admin système ne peuvent pas être modifiés par cette méthode');
      return;
    }
    
    setEditingUser(user);
    
    // Préparer les données pour le formulaire d'édition
    setNewUser({
      name: user.name,
      email: user.email,
      password: '', // Le mot de passe ne sera pas modifié
      role: user.role,
      isActive: user.isActive
    });
    
    // Ouvrir le formulaire d'édition (le même que pour l'ajout)
    setShowUserForm(true);
    
    toast.success(`Modification de l'utilisateur ${user.name}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (currentUser?.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent supprimer des utilisateurs');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (authService.isDemoEmail(currentUser.email)) {
      toast.error('Les comptes de démonstration ne peuvent pas supprimer d\'autres utilisateurs');
      return;
    }

    // Vérifier si c'est un compte Super Admin
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete && userToDelete.isSystemAdmin) {
      toast.error('Les comptes Super Admin système ne peuvent pas être supprimés par cette méthode');
      return;
    }

    setShowDeleteConfirmation(userId);
  };

  const confirmDeleteUser = async () => {
    if (!showDeleteConfirmation) return;

    // Vérifier le mot de passe administrateur
    if (!adminPassword) {
      toast.error('Mot de passe administrateur requis');
      return;
    }

    // Vérification simple du mot de passe (en production, utiliser une méthode plus sécurisée)
    if (adminPassword !== 'admin123') {
      toast.error('Mot de passe administrateur incorrect');
      setAdminPassword('');
      return;
    }

    setIsLoading(true);

    try {
      const userToDelete = users.find(u => u.id === showDeleteConfirmation);
      if (!userToDelete) {
        toast.error('Utilisateur non trouvé');
        return;
      }

      // Étape 1: Supprimer le document Firestore
      await deleteDoc(doc(db, 'users', showDeleteConfirmation));
      console.log('✅ Document Firestore supprimé');

      // Étape 2: Tenter de supprimer l'utilisateur de Firebase Auth
      // Note: Ceci est une tentative, mais elle peut échouer car nous n'avons pas les droits Admin SDK
      // Une solution complète nécessiterait une Cloud Function
      try {
        // Déconnecter l'utilisateur actuel
        const currentAuth = getAuth();
        const currentAuthUser = currentAuth.currentUser;
        
        if (currentAuthUser) {
          await signOut(currentAuth);
        }
        
        // Se connecter avec l'utilisateur à supprimer (cela échouera probablement)
        try {
          await signInWithEmailAndPassword(auth, userToDelete.email, 'password-inconnu');
          // Si on arrive ici, on peut essayer de supprimer l'utilisateur
          if (auth.currentUser) {
            await deleteUser(auth.currentUser);
          }
        } catch (authError) {
          console.log('Impossible de se connecter avec l\'utilisateur à supprimer:', authError);
          // C'est normal, on continue
        }
        
        // Se reconnecter avec l'utilisateur administrateur
        if (currentUser) {
          try {
            await signInWithEmailAndPassword(auth, currentUser.email, adminPassword);
          } catch (reconnectError) {
            console.log('Erreur de reconnexion:', reconnectError);
            // Rediriger vers la page de connexion
            window.location.href = '/login';
            return;
          }
        }
      } catch (authError) {
        console.log('Erreur lors de la tentative de suppression Auth:', authError);
        // On continue car le document Firestore est supprimé
      }

      // Recharger la liste des utilisateurs
      await loadUsers();
      
      setShowDeleteConfirmation(null);
      setAdminPassword('');
      
      toast.success('Utilisateur supprimé avec succès de la base de données');
      toast.info('Note: Pour supprimer complètement le compte de Firebase Authentication, utilisez la console Firebase.');
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression complète:', error);
      toast.error('Erreur lors de la suppression: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent modifier le statut des utilisateurs');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (authService.isDemoEmail(currentUser.email)) {
      toast.error('Les comptes de démonstration ne peuvent pas modifier le statut des utilisateurs');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Vérifier si c'est un compte Super Admin
    if (user.isSystemAdmin) {
      toast.error('Le statut des comptes Super Admin ne peut pas être modifié par cette méthode');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive: !user.isActive,
        updatedAt: Timestamp.now()
      });

      await loadUsers();
      toast.success('Statut utilisateur mis à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleForceLogout = async () => {
    try {
      // Déconnexion complète avec nettoyage du cache
      await auth.signOut();
      
      // Vider le localStorage et sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Forcer le rechargement complet de la page
      window.location.href = '/login';
      
      toast.success('Déconnexion forcée réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion forcée:', error);
      toast.error('Erreur lors de la déconnexion forcée');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'cashier': return 'bg-green-100 text-green-800';
      case 'reader': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj ? roleObj.name : role;
  };

  // Fonction pour mettre à jour un utilisateur existant
  const handleUpdateUser = async () => {
    if (!editingUser) {
      toast.error('Aucun utilisateur sélectionné pour la modification');
      return;
    }

    if (!newUser.name) {
      toast.error('Le nom est requis');
      return;
    }

    if (currentUser?.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent modifier les utilisateurs');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (authService.isDemoEmail(currentUser.email)) {
      toast.error('Les comptes de démonstration ne peuvent pas modifier d\'autres utilisateurs');
      return;
    }

    // Vérifier si on essaie de modifier un compte Super Admin
    if (editingUser.isSystemAdmin) {
      toast.error('Les comptes Super Admin système ne peuvent pas être modifiés par cette méthode');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mettre à jour le document utilisateur dans Firestore
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        isClientAdmin: newUser.role === 'admin', // Mettre à jour le flag isClientAdmin si le rôle est admin
        updatedAt: Timestamp.now()
      });

      // Recharger la liste des utilisateurs
      await loadUsers();
      
      // Réinitialiser le formulaire
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'cashier', 
        isActive: true 
      });
      setShowUserForm(false);
      setEditingUser(null);
      
      toast.success('Utilisateur modifié avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la modification de l\'utilisateur:', error);
      toast.error('Erreur lors de la modification de l\'utilisateur');
    } finally {
      setIsLoading(false);
    }
  };

  // Render functions for each tab
  const renderGeneralSettings = () => (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'établissement</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nom de l'établissement"
          value={establishmentSettings.name}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, name: e.target.value})}
        />
        <Input
          label="Adresse"
          value={establishmentSettings.address}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, address: e.target.value})}
        />
        <Input
          label="Téléphone"
          value={establishmentSettings.phone}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, phone: e.target.value})}
        />
        <Input
          label="Email"
          type="email"
          value={establishmentSettings.email}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, email: e.target.value})}
        />
        <Input
          label="NIF"
          value={establishmentSettings.nif}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, nif: e.target.value})}
        />
        <Input
          label="STAT"
          value={establishmentSettings.stat}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, stat: e.target.value})}
        />
        <Input
          label="Devise"
          value={establishmentSettings.currency}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, currency: e.target.value})}
        />
        <Input
          label="Taux de TVA (%)"
          type="number"
          value={establishmentSettings.taxRate.toString()}
          onChange={(e) => setEstablishmentSettings({...establishmentSettings, taxRate: parseInt(e.target.value)})}
        />
      </div>
      <div className="mt-6">
        <Button onClick={handleSaveEstablishment} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </Card>
  );

  const renderPOSSettings = () => (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration du Point de Vente</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Ouverture automatique du tiroir-caisse</label>
            <p className="text-sm text-gray-500">Ouvrir automatiquement le tiroir après chaque vente</p>
          </div>
          <input
            type="checkbox"
            checked={posSettings.autoOpenDrawer}
            onChange={(e) => setPosSettings({...posSettings, autoOpenDrawer: e.target.checked})}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Impression automatique des reçus</label>
            <p className="text-sm text-gray-500">Imprimer automatiquement après chaque vente</p>
          </div>
          <input
            type="checkbox"
            checked={posSettings.autoPrintReceipt}
            onChange={(e) => setPosSettings({...posSettings, autoPrintReceipt: e.target.checked})}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement par défaut</label>
          <select
            value={posSettings.defaultPaymentMethod}
            onChange={(e) => setPosSettings({...posSettings, defaultPaymentMethod: e.target.value})}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
            <option value="mobile">Mobile Money</option>
          </select>
        </div>

        <Input
          label="Pied de page des reçus"
          value={posSettings.receiptFooter}
          onChange={(e) => setPosSettings({...posSettings, receiptFooter: e.target.value})}
          placeholder="Message à afficher en bas des reçus"
        />

        <Input
          label="Seuil d'alerte stock faible"
          type="number"
          value={posSettings.lowStockAlert.toString()}
          onChange={(e) => setPosSettings({...posSettings, lowStockAlert: parseInt(e.target.value)})}
        />

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Programme de fidélité</label>
            <p className="text-sm text-gray-500">Activer le système de points de fidélité</p>
          </div>
          <input
            type="checkbox"
            checked={posSettings.enableLoyalty}
            onChange={(e) => setPosSettings({...posSettings, enableLoyalty: e.target.checked})}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <Button onClick={handleSavePOS} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </Card>
  );

  const renderUsersSettings = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h3>
          {currentUser?.role === 'admin' && !authService.isDemoEmail(currentUser.email) && (
            <Button onClick={() => setShowUserForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          )}
        </div>

        {loadingUsers ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Chargement des utilisateurs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      {user.isSystemAdmin && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Super Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {currentUser?.role === 'admin' && !authService.isDemoEmail(currentUser.email) && !user.isSystemAdmin && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id)}
                              className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                            >
                              {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  const renderEmailsSettings = () => (
    <EmailManagement users={users} />
  );

  const renderEmailJSSettings = () => (
    <EmailJSConfig onClose={() => setActiveTab('general')} />
  );
  const renderDataSettings = () => (
    <DataResetManager />
  );

  const renderBackupSettings = () => (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sauvegarde et restauration</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Sauvegarde automatique</h4>
            <p className="text-sm text-gray-500">Sauvegarde quotidienne de vos données</p>
          </div>
          <Button variant="outline" onClick={() => toast.info('Fonctionnalité de sauvegarde en cours de développement')}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Restaurer les données</h4>
            <p className="text-sm text-gray-500">Restaurer à partir d'une sauvegarde</p>
          </div>
          <Button variant="outline" onClick={() => toast.info('Fonctionnalité de restauration en cours de développement')}>
            <Upload className="w-4 h-4 mr-2" />
            Restaurer
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderSystemAdminSettings = () => (
    <SystemAdminManager />
  );

  const renderAdminListSettings = () => (
    <AdminListManager />
  );

  const renderAllUsersSettings = () => (
    <AllUsersList />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-1">
            Configurez votre système de point de vente
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? tab.id === 'system-admin' 
                      ? 'border-red-500 text-red-600'
                      : 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'pos' && renderPOSSettings()}
        {activeTab === 'users' && renderUsersSettings()}
        {activeTab === 'emails' && renderEmailsSettings()}
        {activeTab === 'emailjs' && renderEmailJSSettings()}
        {activeTab === 'data' && renderDataSettings()}
        {activeTab === 'backup' && renderBackupSettings()}
        {activeTab === 'system-admin' && renderSystemAdminSettings()}
        {activeTab === 'admin-list' && renderAdminListSettings()}
        {activeTab === 'all-users' && renderAllUsersSettings()}
        {activeTab === 'printer' && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration d'impression</h3>
            <p className="text-gray-600">Module d'impression en cours de développement...</p>
          </Card>
        )}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de sécurité</h3>
              <p className="text-gray-600 mb-4">Module de sécurité en cours de développement...</p>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-start">
                <Lock className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Restriction de sécurité active</h4>
                  <p className="text-sm text-red-700 mt-1">
                    La création, modification et suppression de comptes Super Admin système est désactivée pour des raisons de sécurité.
                    Ces opérations sont réservées uniquement aux processus internes sécurisés.
                  </p>
                </div>
              </div>
            </Card>
            
            <SuperAdminCleanup />
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </h3>
            
            <div className="space-y-4">
              <Input
                label="Nom complet"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Ex: Marie Dupont"
                disabled={isLoading}
              />
              
              <Input
                label="Adresse email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="marie@nirinanirina.mg"
                disabled={isLoading || !!editingUser} // Désactiver l'email en mode édition
              />
              
              {!editingUser && (
                <Input
                  label="Mot de passe"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newUser.isActive}
                  onChange={(e) => setNewUser({...newUser, isActive: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Utilisateur actif
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  setNewUser({
                    name: '',
                    email: '',
                    password: '',
                    role: 'cashier',
                    isActive: true
                  });
                }}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                disabled={isLoading}
              >
                {isLoading ? 'Traitement en cours...' : editingUser ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Suppression complète de l'utilisateur
              </h3>
              
              <p className="text-gray-600 mb-6">
                Cette action supprimera l'utilisateur de Firestore ET de Firebase Authentication. 
                Cette action est irréversible.
              </p>

              <div className="mb-6">
                <Input
                  label="Mot de passe administrateur"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe admin"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Veuillez saisir votre mot de passe administrateur pour confirmer cette action.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">⚠️ Attention :</p>
                    <ul className="mt-2 space-y-1 text-left">
                      <li>• Suppression du document Firestore</li>
                      <li>• Suppression du compte Firebase Auth</li>
                      <li>• Action irréversible</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  fullWidth 
                  onClick={() => {
                    setShowDeleteConfirmation(null);
                    setAdminPassword('');
                  }}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button 
                  variant="danger" 
                  fullWidth 
                  onClick={confirmDeleteUser}
                  disabled={isLoading || !adminPassword.trim()}
                >
                  {isLoading ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};