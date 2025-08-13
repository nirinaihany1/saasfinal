import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  AlertTriangle, 
  Shield, 
  Trash2, 
  RefreshCw, 
  CheckCircle,
  Key,
  Lock,
  LogOut,
  Info,
  X
} from 'lucide-react';
import { 
  signInWithEmailAndPassword,
  deleteUser,
  signOut,
  getAuth
} from 'firebase/auth';
import { 
  doc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export const SuperAdminCleanup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const handleCleanupSuperAdmin = () => {
    setShowPasswordPrompt(true);
    setAdminPassword('');
    setResult(null);
  };

  const confirmCleanup = async () => {
    if (!adminPassword) {
      toast.error('Mot de passe requis');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Déconnexion de l'utilisateur actuel
      await signOut(auth);
      
      // 2. Tentative de connexion avec le compte superadmin
      try {
        const credential = await signInWithEmailAndPassword(
          auth, 
          'superadmin@saaspos.mg', 
          adminPassword
        );
        
        // 3. Si la connexion réussit, supprimer l'utilisateur
        if (credential.user) {
          // Supprimer l'utilisateur de Firebase Auth
          await deleteUser(credential.user);
          console.log('✅ Utilisateur Firebase Auth supprimé');
          
          // Supprimer le document Firestore
          try {
            await deleteDoc(doc(db, 'users', credential.user.uid));
            console.log('✅ Document Firestore supprimé');
          } catch (firestoreError) {
            console.error('❌ Erreur lors de la suppression du document Firestore:', firestoreError);
          }
          
          // Rechercher et supprimer d'autres documents avec cet email
          try {
            const q = query(
              collection(db, 'users'), 
              where('email', '==', 'superadmin@saaspos.mg')
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
                console.log('✅ Document supplémentaire supprimé:', doc.id);
              }
            }
          } catch (queryError) {
            console.error('❌ Erreur lors de la recherche de documents supplémentaires:', queryError);
          }
          
          setResult({
            success: true,
            message: 'Compte superadmin supprimé avec succès !',
            details: 'Le compte a été complètement supprimé de Firebase Authentication et de Firestore.'
          });
          
          // Vider le localStorage et sessionStorage
          localStorage.clear();
          sessionStorage.clear();
          
          // Fermer le modal
          setShowPasswordPrompt(false);
        }
      } catch (loginError: any) {
        console.error('❌ Erreur de connexion:', loginError);
        
        if (loginError.code === 'auth/invalid-credential') {
          setResult({
            success: false,
            message: 'Mot de passe incorrect',
            details: 'Le mot de passe saisi ne correspond pas au compte superadmin@saaspos.mg. Vérifiez le mot de passe ou utilisez la console Firebase pour supprimer le compte manuellement.'
          });
        } else if (loginError.code === 'auth/user-not-found') {
          setResult({
            success: true,
            message: 'Le compte superadmin n\'existe plus',
            details: 'Le compte superadmin@saaspos.mg a déjà été supprimé de Firebase Authentication. Nettoyage des données Firestore en cours...'
          });
          
          // Tenter de nettoyer les documents Firestore restants
          try {
            const q = query(
              collection(db, 'users'), 
              where('email', '==', 'superadmin@saaspos.mg')
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
                console.log('✅ Document Firestore supplémentaire supprimé:', doc.id);
              }
              setResult({
                success: true,
                message: 'Nettoyage terminé',
                details: 'Le compte n\'existait plus dans Firebase Auth, mais des documents Firestore ont été supprimés.'
              });
            }
          } catch (cleanupError) {
            console.error('❌ Erreur lors du nettoyage Firestore:', cleanupError);
          }
          
          // Fermer le modal
          setShowPasswordPrompt(false);
        } else if (loginError.code === 'auth/wrong-password') {
          setResult({
            success: false,
            message: 'Mot de passe incorrect',
            details: 'Le mot de passe saisi est incorrect. Essayez avec le mot de passe correct ou utilisez la console Firebase.'
          });
        } else if (loginError.code === 'auth/too-many-requests') {
          setResult({
            success: false,
            message: 'Trop de tentatives',
            details: 'Trop de tentatives de connexion échouées. Attendez quelques minutes avant de réessayer.'
          });
        } else {
          setResult({
            success: false,
            message: 'Erreur lors de la tentative de connexion',
            details: `Code d'erreur: ${loginError.code}. ${loginError.message}`
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du nettoyage:', error);
      setResult({
        success: false,
        message: 'Erreur lors du nettoyage',
        details: error.message
      });
    } finally {
      setIsLoading(false);
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

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-red-600" />
            Nettoyage du compte Super Admin
          </h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800 flex items-center">
                Zone Sécurisée - Administrateur Uniquement
                <Lock className="w-4 h-4 ml-2" />
              </h4>
              <p className="text-sm text-red-700 mt-1">
                Si vous avez supprimé le compte superadmin@saaspos.mg mais qu'il reste accessible, 
                utilisez cet outil pour le supprimer complètement de Firebase Authentication et de Firestore.
              </p>
            </div>
          </div>
        </div>
        
        {result && (
          <div className={`border rounded-lg p-4 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              )}
              <div className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                <p className="font-medium">{result.message}</p>
                {result.details && <p className="mt-1">{result.details}</p>}
                
                {result.success && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 font-medium text-xs mb-2">
                      🎉 Nettoyage terminé !
                    </p>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>• Le compte superadmin a été complètement supprimé</p>
                      <p>• Vous devez maintenant vous déconnecter et vous reconnecter</p>
                      <p>• Si nécessaire, reconfigurer le système depuis la page de configuration</p>
                    </div>
                  </div>
                )}
                
                {!result.success && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 font-medium text-xs mb-2">
                      Solutions possibles :
                    </p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Vérifiez que le mot de passe est correct</li>
                      <li>• Essayez la déconnexion forcée ci-dessous</li>
                      <li>• Utilisez la console Firebase pour supprimer le compte manuellement</li>
                      <li>• Attendez quelques minutes si trop de tentatives ont été effectuées</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <Button 
            variant="danger" 
            onClick={handleCleanupSuperAdmin}
            disabled={isLoading}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer définitivement le compte superadmin
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleForceLogout}
            disabled={isLoading}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion forcée et nettoyage du cache
          </Button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Mots de passe courants</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Pour cette démo, utilisez le mot de passe : <strong>superadmin123</strong></p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <Lock className="w-5 h-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-800">Comment ça fonctionne</h4>
              <ol className="text-sm text-gray-700 mt-1 space-y-1">
                <li>1. L'outil tente de se connecter au compte superadmin</li>
                <li>2. Si la connexion réussit, il supprime le compte de Firebase Auth</li>
                <li>3. Il supprime également tous les documents Firestore associés</li>
                <li>4. Si le compte n'existe plus, il nettoie seulement Firestore</li>
                <li>5. Après la suppression, vous devrez vous reconnecter</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de saisie du mot de passe */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mot de passe du compte superadmin
              </h3>
              
              <p className="text-gray-600 mb-6">
                Pour supprimer le compte superadmin@saaspos.mg, veuillez saisir son mot de passe.
              </p>

              <div className="mb-6">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Mot de passe superadmin"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && confirmCleanup()}
                  autoFocus
                />
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>Pour cette démo, utilisez le mot de passe : <strong>superadmin123</strong></p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">⚠️ Attention :</p>
                    <p>Cette action supprimera définitivement le compte superadmin et est irréversible.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  fullWidth 
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setAdminPassword('');
                  }}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button 
                  variant="danger" 
                  fullWidth 
                  onClick={confirmCleanup}
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
                      Supprimer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
};