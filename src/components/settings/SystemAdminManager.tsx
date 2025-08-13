import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Key,
  Mail,
  Info,
  Lock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import type { User } from '../../types';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

interface NewAdminData {
  name: string;
  email: string;
  password: string;
}

export const SystemAdminManager: React.FC = () => {
  const [systemAdmins, setSystemAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [securityRestricted, setSecurityRestricted] = useState(true);
  
  const [newAdmin, setNewAdmin] = useState<NewAdminData>({
    name: '',
    email: '',
    password: ''
  });

  const { user: currentUser } = useAuthStore();

  // Vérifier si l'utilisateur actuel est un Super Admin
  const isSuperAdmin = currentUser?.isSystemAdmin === true;

  // Vérifier si l'utilisateur est un compte de démonstration
  const isDemoAccount = () => {
    return currentUser?.email ? authService.isDemoEmail(currentUser.email) : false;
  };

  // Charger les administrateurs système
  const loadSystemAdmins = async () => {
    if (!isSuperAdmin) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'users'),
        where('isSystemAdmin', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const adminsData = snapshot.docs.map(doc => {
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
          lastLogin: data.lastLogin?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as User;
      });
      
      setSystemAdmins(adminsData);
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs système:', error);
      toast.error('Erreur lors du chargement des administrateurs système');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadSystemAdmins();
    }
  }, [isSuperAdmin]);

  const handleAddAdmin = () => {
    if (securityRestricted) {
      toast.error('La création de comptes Super Admin est désactivée pour des raisons de sécurité');
      return;
    }
    
    setEditingAdmin(null);
    setNewAdmin({
      name: '',
      email: '',
      password: ''
    });
    setShowForm(true);
  };

  const handleEditAdmin = (admin: User) => {
    if (securityRestricted) {
      toast.error('La modification de comptes Super Admin est désactivée pour des raisons de sécurité');
      return;
    }
    
    setEditingAdmin(admin);
    setNewAdmin({
      name: admin.name,
      email: admin.email,
      password: ''
    });
    setShowForm(true);
  };

  const handleSubmitAdmin = async () => {
    if (securityRestricted) {
      toast.error('La création/modification de comptes Super Admin est désactivée pour des raisons de sécurité');
      return;
    }
    
    if (!newAdmin.name || !newAdmin.email) {
      toast.error('Le nom et l\'email sont requis');
      return;
    }

    if (!editingAdmin && !newAdmin.password) {
      toast.error('Le mot de passe est requis pour un nouveau compte');
      return;
    }

    if (!isSuperAdmin) {
      toast.error('Seuls les Super Admins peuvent gérer les administrateurs système');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas gérer les administrateurs système');
      return;
    }

    setIsLoading(true);
    
    try {
      if (editingAdmin) {
        // Modifier un administrateur existant
        const updateData: any = {
          name: newAdmin.name,
          updatedAt: Timestamp.now()
        };

        // Ne pas modifier l'email pour éviter les complications avec Firebase Auth
        await updateDoc(doc(db, 'users', editingAdmin.id), updateData);

        toast.success('Administrateur modifié avec succès');
      } else {
        // Créer un nouvel administrateur système
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          newAdmin.email, 
          newAdmin.password
        );

        await updateProfile(userCredential.user, {
          displayName: newAdmin.name
        });

        const userData = {
          id: userCredential.user.uid,
          email: newAdmin.email,
          name: newAdmin.name,
          role: 'admin',
          establishmentId: 'SYSTEM_ADMIN', // Identifiant spécial pour les admins système
          isActive: true,
          isSuperAdmin: true,
          isSystemAdmin: true,
          isClientAdmin: false,
          lastLogin: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        toast.success('Administrateur système ajouté avec succès');
      }

      // Recharger la liste des administrateurs
      await loadSystemAdmins();
      
      // Réinitialiser le formulaire
      setNewAdmin({ 
        name: '', 
        email: '', 
        password: ''
      });
      setShowForm(false);
      setEditingAdmin(null);
      
    } catch (error: any) {
      console.error('Erreur lors de la gestion de l\'administrateur:', error);
      
      let errorMessage = 'Erreur lors de la gestion de l\'administrateur';
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
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = (admin: User) => {
    if (securityRestricted) {
      toast.error('La suppression de comptes Super Admin est désactivée pour des raisons de sécurité');
      return;
    }
    
    if (admin.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas supprimer d\'administrateurs système');
      return;
    }

    setAdminToDelete(admin);
    setShowDeleteConfirm(true);
    setAdminPassword('');
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;

    // Vérifier le mot de passe administrateur
    if (!adminPassword) {
      toast.error('Mot de passe administrateur requis');
      return;
    }

    // Vérification du mot de passe
    if (adminPassword !== 'superadmin123') {
      toast.error('Mot de passe administrateur incorrect');
      setAdminPassword('');
      return;
    }

    setIsLoading(true);
    try {
      // Supprimer le document utilisateur de Firestore
      await deleteDoc(doc(db, 'users', adminToDelete.id));
      toast.success('Administrateur supprimé avec succès');

      await loadSystemAdmins();
      setShowDeleteConfirm(false);
      setAdminToDelete(null);
      setAdminPassword('');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'administrateur:', error);
      toast.error('Erreur lors de la suppression de l\'administrateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = (admin: User) => {
    if (securityRestricted) {
      toast.error('La réinitialisation de mot de passe pour les comptes Super Admin est désactivée pour des raisons de sécurité');
      return;
    }
    
    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas réinitialiser les mots de passe');
      return;
    }

    setSelectedAdminForReset(admin);
    setShowPasswordReset(true);
  };

  const sendPasswordResetToAdmin = async () => {
    if (!selectedAdminForReset) return;

    try {
      setIsLoading(true);
      
      // Configuration supplémentaire pour l'envoi d'email
      const actionCodeSettings = {
        url: window.location.origin + '/login', // URL de redirection après réinitialisation
        handleCodeInApp: false
      };
      
      // Envoyer l'email de réinitialisation
      await sendPasswordResetEmail(auth, selectedAdminForReset.email, actionCodeSettings);
      
      console.log(`Email de réinitialisation envoyé à: ${selectedAdminForReset.email}`);
      toast.success(`Email de réinitialisation envoyé à ${selectedAdminForReset.email}`);
      setShowPasswordReset(false);
      setSelectedAdminForReset(null);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi de l\'email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Utilisateur non trouvé';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Réessayez plus tard.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Si l'utilisateur n'est pas un Super Admin, afficher un message d'accès refusé
  if (!isSuperAdmin) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
          <p className="text-gray-600 mb-4">
            Seuls les Super Administrateurs système peuvent accéder à cette section.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-red-600" />
          Gestion des Administrateurs Système
        </h3>
        <Button 
          onClick={handleAddAdmin}
          disabled={securityRestricted}
          className={securityRestricted ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un Admin
        </Button>
      </div>

      {/* Restriction de sécurité */}
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

      {/* Explication */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">À propos des Administrateurs Système</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Les Administrateurs Système ont accès à la validation des paiements</p>
                <p>• Ils peuvent gérer tous les établissements clients</p>
                <p>• Ils ont un accès complet au système d'administration</p>
                <p>• Chaque Admin Système a les mêmes droits et privilèges</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des administrateurs */}
      <Card>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des administrateurs...</p>
          </div>
        ) : systemAdmins.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun administrateur trouvé</h3>
            <p className="text-gray-500 mb-4">Les administrateurs système apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {systemAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{admin.name}</p>
                    <p className="text-sm text-gray-600">{admin.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                      Super Admin
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {admin.id === currentUser?.id ? (
                    <span className="text-xs text-gray-500 italic">Vous-même</span>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAdmin(admin)}
                        title="Modifier l'administrateur"
                        disabled={securityRestricted}
                        className={securityRestricted ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePasswordReset(admin)}
                        title="Réinitialiser le mot de passe"
                        className={`text-orange-600 hover:text-orange-700 hover:bg-orange-50 ${securityRestricted ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={securityRestricted}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin)}
                        title="Supprimer l'administrateur"
                        className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${securityRestricted ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={securityRestricted}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-600" />
                {editingAdmin ? 'Modifier l\'administrateur' : 'Ajouter un administrateur système'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingAdmin(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Nom complet"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                placeholder="Ex: Jean Dupont"
                disabled={isLoading}
              />
              
              <Input
                label="Adresse email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                placeholder="admin@example.com"
                disabled={isLoading || !!editingAdmin} // Désactiver l'email en mode édition
                leftIcon={<Mail className="w-4 h-4" />}
              />
              
              {!editingAdmin && (
                <Input
                  label="Mot de passe"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  placeholder="••••••••"
                  disabled={isLoading}
                  leftIcon={<Key className="w-4 h-4" />}
                />
              )}

              {editingAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note :</strong> L'email ne peut pas être modifié pour des raisons de sécurité. 
                    Pour changer le mot de passe, utilisez le bouton "🔑\" dans la liste des administrateurs.
                  </p>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Attention : Privilèges élevés</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Les Administrateurs Système ont un accès complet à toutes les fonctionnalités 
                      d'administration, y compris la validation des paiements et la gestion des clients.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowForm(false);
                  setEditingAdmin(null);
                }}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitAdmin}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingAdmin ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingAdmin ? 'Modifier' : 'Ajouter'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && adminToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                Supprimer l'administrateur
              </h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAdminToDelete(null);
                  setAdminPassword('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Confirmation de suppression</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Êtes-vous sûr de vouloir supprimer cet administrateur système ? 
                      Cette action est irréversible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{adminToDelete.name}</p>
                    <p className="text-sm text-gray-600">{adminToDelete.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>

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
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAdminToDelete(null);
                  setAdminPassword('');
                }}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                variant="danger"
                onClick={confirmDeleteAdmin}
                disabled={isLoading || !adminPassword.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de réinitialisation de mot de passe */}
      {showPasswordReset && selectedAdminForReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Réinitialiser le mot de passe
              </h3>
              <button
                onClick={() => {
                  setShowPasswordReset(false);
                  setSelectedAdminForReset(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">Réinitialisation sécurisée</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Un email de réinitialisation sera envoyé à l'administrateur. Il pourra alors créer un nouveau mot de passe en toute sécurité.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedAdminForReset.name}</p>
                    <p className="text-sm text-gray-600">{selectedAdminForReset.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Processus de réinitialisation</h4>
                    <ol className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>1. Un email sera envoyé à <strong>{selectedAdminForReset.email}</strong></li>
                      <li>2. L'administrateur cliquera sur le lien dans l'email</li>
                      <li>3. Il pourra définir un nouveau mot de passe</li>
                      <li>4. Le nouveau mot de passe sera actif immédiatement</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowPasswordReset(false);
                  setSelectedAdminForReset(null);
                }}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={sendPasswordResetToAdmin}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l'email
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};