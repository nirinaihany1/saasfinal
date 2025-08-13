import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  Mail, 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle,
  Key,
  Shield,
  Users,
  Info
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  updateDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { 
  updateEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface EmailManagementProps {
  users: any[];
  onUsersUpdate: () => void;
}

const EmailManagement: React.FC<EmailManagementProps> = ({ users, onUsersUpdate }) => {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { user: currentUser } = useAuthStore();

  const handleEditEmail = (user: any) => {
    setEditingUser(user);
    setNewEmail(user.email);
    setCurrentPassword('');
    setVerificationSent(false);
    
    // Si c'est l'utilisateur actuel, demander le mot de passe pour la réauthentification
    if (user.id === currentUser?.id) {
      setShowPasswordPrompt(true);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpdateEmail = async () => {
    if (!editingUser || !newEmail.trim()) {
      toast.error('Email requis');
      return;
    }

    if (!validateEmail(newEmail)) {
      toast.error('Format d\'email invalide');
      return;
    }

    if (newEmail === editingUser.email) {
      toast.error('Le nouvel email doit être différent de l\'actuel');
      return;
    }

    // Validation du mot de passe pour l'utilisateur actuel
    if (editingUser.id === currentUser?.id && !currentPassword.trim()) {
      toast.error('Mot de passe requis pour modifier votre propre email');
      return;
    }

    setIsLoading(true);

    try {
      // Si c'est l'utilisateur actuel, on peut mettre à jour Firebase Auth
      if (editingUser.id === currentUser?.id && auth.currentUser) {
        try {
          // Réauthentifier d'abord
          const credential = EmailAuthProvider.credential(editingUser.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
          
          // Utiliser verifyBeforeUpdateEmail au lieu de updateEmail directement
          // Cela envoie un email de vérification avant de changer l'email
          await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
          
          toast.success('Email de vérification envoyé ! Vérifiez votre nouvelle adresse email pour confirmer le changement.');
          setVerificationSent(true);
          
          // Ne pas fermer le modal immédiatement pour montrer le message de vérification
          
        } catch (authError: any) {
          console.error('Erreur Firebase Auth:', authError);
          
          let errorMessage = 'Erreur lors de la mise à jour';
          switch (authError.code) {
            case 'auth/email-already-in-use':
              errorMessage = 'Cette adresse email est déjà utilisée par un autre compte';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Format d\'email invalide';
              break;
            case 'auth/wrong-password':
              errorMessage = 'Mot de passe incorrect. Veuillez vérifier votre mot de passe actuel.';
              break;
            case 'auth/invalid-credential':
              errorMessage = 'Mot de passe incorrect. Veuillez vérifier votre mot de passe actuel.';
              break;
            case 'auth/requires-recent-login':
              errorMessage = 'Pour des raisons de sécurité, veuillez vous reconnecter avant de modifier votre email';
              break;
            case 'auth/operation-not-allowed':
              errorMessage = 'Cette opération n\'est pas autorisée. Contactez l\'administrateur.';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.';
              break;
            default:
              errorMessage = authError.message || 'Erreur inconnue lors de la mise à jour de l\'email';
          }
          
          toast.error(errorMessage);
          setIsLoading(false);
          return; // Arrêter l'exécution ici
        }
      }

      // Mettre à jour l'email dans Firestore seulement si ce n'est pas l'utilisateur actuel
      // ou si la vérification email a été envoyée avec succès
      if (editingUser.id !== currentUser?.id || verificationSent) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          email: newEmail,
          updatedAt: Timestamp.now(),
          // Marquer comme non vérifié si c'est l'utilisateur actuel
          ...(editingUser.id === currentUser?.id && { emailVerified: false })
        });

        // Recharger les utilisateurs
        await onUsersUpdate();
        
        if (editingUser.id !== currentUser?.id) {
          toast.success('Email mis à jour avec succès. L\'utilisateur devra se reconnecter avec sa nouvelle adresse.');
          setEditingUser(null);
          setShowPasswordPrompt(false);
          setCurrentPassword('');
        }
      }
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'email:', error);
      toast.error('Erreur lors de la mise à jour de l\'email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setShowPasswordPrompt(false);
    setCurrentPassword('');
    setVerificationSent(false);
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Veuillez saisir une adresse email');
      return;
    }
    
    if (!validateEmail(resetEmail)) {
      toast.error('Format d\'email invalide');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Configuration supplémentaire pour l'envoi d'email
      const actionCodeSettings = {
        url: window.location.origin + '/login', // URL de redirection après réinitialisation
        handleCodeInApp: false
      };
      
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      
      console.log(`Email de réinitialisation envoyé à: ${resetEmail}`);
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception et vos spams.');
      setShowPasswordResetForm(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi de l\'email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte trouvé avec cette adresse email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format d\'email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = error.message || 'Erreur lors de l\'envoi de l\'email';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoEmails = () => {
    return users.filter(user => user.email.includes('@saaspos.mg'));
  };

  const getRealEmails = () => {
    return users.filter(user => !user.email.includes('@saaspos.mg'));
  };

  const demoUsers = getDemoEmails();
  const realUsers = getRealEmails();

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Gestion des adresses email
        </h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Comment modifier les emails</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Cliquez sur "Modifier" à côté de l'email à changer</p>
                <p>• Saisissez votre vraie adresse email</p>
                <p>• Pour votre propre compte, vous devrez confirmer votre mot de passe</p>
                <p>• Un email de vérification sera envoyé à la nouvelle adresse</p>
                <p>• Vous devrez cliquer sur le lien de vérification pour finaliser le changement</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bouton pour réinitialiser le mot de passe */}
        <div className="mt-4">
          <Button 
            onClick={() => setShowPasswordResetForm(true)}
            variant="ghost"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Key className="w-4 h-4 mr-2" />
            Réinitialiser un mot de passe
          </Button>
          <p className="text-xs text-gray-600 mt-1">
            Envoyez un email de réinitialisation à n'importe quelle adresse email
          </p>
        </div>
      </Card>

      {/* Comptes avec emails de démonstration */}
      {demoUsers.length > 0 && (
        <Card>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Comptes avec emails de démonstration ({demoUsers.length})
          </h4>
          
          <div className="space-y-3">
            {demoUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-orange-700 font-mono">{user.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                      {user.role === 'admin' ? 'Administrateur' : 
                       user.role === 'manager' ? 'Gérant' :
                       user.role === 'cashier' ? 'Caissier' : 'Lecteur'}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditEmail(user)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Comptes avec vraies adresses email */}
      {realUsers.length > 0 && (
        <Card>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Comptes avec vraies adresses email ({realUsers.length})
          </h4>
          
          <div className="space-y-3">
            {realUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-green-700 font-mono">{user.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {user.role === 'admin' ? 'Administrateur' : 
                       user.role === 'manager' ? 'Gérant' :
                       user.role === 'cashier' ? 'Caissier' : 'Lecteur'}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditEmail(user)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal de modification d'email */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Modifier l'email
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{editingUser.name}</p>
                    <p className="text-sm text-gray-600">Email actuel: {editingUser.email}</p>
                  </div>
                </div>
              </div>

              {verificationSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Email de vérification envoyé !</h4>
                      <div className="text-sm text-green-700 mt-1 space-y-1">
                        <p>Un email de vérification a été envoyé à <strong>{newEmail}</strong></p>
                        <p>Cliquez sur le lien dans l'email pour confirmer le changement d'adresse.</p>
                        <p>Votre email actuel restera actif jusqu'à la vérification.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    label="Nouvelle adresse email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="votre@vraiemail.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                    disabled={isLoading}
                  />

                  {showPasswordPrompt && editingUser.id === currentUser?.id && (
                    <div>
                      <Input
                        label="Votre mot de passe actuel (pour sécurité)"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        leftIcon={<Key className="w-4 h-4" />}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Requis pour modifier votre propre email. Assurez-vous de saisir le bon mot de passe.
                      </p>
                    </div>
                  )}

                  {editingUser.id !== currentUser?.id && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium">Modification d'un autre utilisateur</p>
                          <p>L'email sera mis à jour dans la base de données. L'utilisateur devra se reconnecter avec sa nouvelle adresse.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Processus de changement d'email :</p>
                        <ul className="mt-1 space-y-1">
                          {editingUser.id === currentUser?.id ? (
                            <>
                              <li>• Un email de vérification sera envoyé à la nouvelle adresse</li>
                              <li>• Vous devrez cliquer sur le lien de vérification</li>
                              <li>• L'ancien email restera actif jusqu'à la vérification</li>
                              <li>• Une fois vérifié, vous devrez vous reconnecter</li>
                            </>
                          ) : (
                            <>
                              <li>• L'email sera mis à jour immédiatement</li>
                              <li>• L'utilisateur devra se connecter avec le nouvel email</li>
                              <li>• L'ancien email ne fonctionnera plus</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={handleCloseModal}
                disabled={isLoading}
              >
                {verificationSent ? 'Fermer' : 'Annuler'}
              </Button>
              {!verificationSent && (
                <Button 
                  onClick={handleUpdateEmail}
                  disabled={
                    isLoading || 
                    !newEmail.trim() || 
                    !validateEmail(newEmail) ||
                    newEmail === editingUser.email ||
                    (showPasswordPrompt && !currentPassword.trim())
                  }
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Mettre à jour
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal de réinitialisation de mot de passe */}
      {showPasswordResetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Réinitialiser un mot de passe
              </h3>
              <button
                onClick={() => setShowPasswordResetForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSendPasswordReset} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Comment ça fonctionne</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Saisissez l'adresse email de l'utilisateur qui souhaite réinitialiser son mot de passe. 
                      Un email contenant un lien de réinitialisation lui sera envoyé.
                    </p>
                  </div>
                </div>
              </div>
              
              <Input
                label="Adresse email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="email@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                disabled={isLoading}
                required
              />
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important</p>
                    <p>Assurez-vous que l'adresse email est correcte et associée à un compte existant.</p>
                    <p className="mt-1">L'email peut arriver dans les spams, vérifiez tous les dossiers.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowPasswordResetForm(false)}
                  disabled={isLoading}
                  type="button"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={isLoading || !resetEmail.trim() || !validateEmail(resetEmail)}
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
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export { EmailManagement };