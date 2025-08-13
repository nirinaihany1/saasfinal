import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Trash2, 
  AlertTriangle, 
  Database, 
  DollarSign,
  TrendingDown,
  Receipt,
  Users,
  Package,
  RefreshCw,
  Shield,
  Lock,
  UserX,
  Key
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

interface DataStats {
  sales: number;
  expenses: number;
  customers: number;
  products: number;
}

export const DataResetManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: string; action: () => void } | null>(null);
  const [dataStats, setDataStats] = useState<DataStats>({
    sales: 0,
    expenses: 0,
    customers: 0,
    products: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const { user } = useAuthStore();

  // Vérifier si l'utilisateur a les permissions nécessaires
  const hasDataManagementPermission = () => {
    return user?.role === 'admin';
  };

  // Vérifier si l'utilisateur est un compte de démonstration
  const isDemoAccount = () => {
    return user?.email ? authService.isDemoEmail(user.email) : false;
  };

  // Charger les statistiques des données
  const loadDataStats = async () => {
    if (!user?.establishmentId) return;

    setLoadingStats(true);
    try {
      const collections = ['sales', 'expenses', 'customers', 'products'];
      const stats: DataStats = { sales: 0, expenses: 0, customers: 0, products: 0 };

      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('establishmentId', '==', user.establishmentId)
        );
        const snapshot = await getDocs(q);
        stats[collectionName as keyof DataStats] = snapshot.size;
      }

      setDataStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (hasDataManagementPermission()) {
      loadDataStats();
    }
  }, [user?.establishmentId]);

  // Vérifier le mot de passe administrateur
  const verifyAdminPassword = (password: string): boolean => {
    // Le seul mot de passe valide est "admin123"
    return password === 'admin123';
  };

  // Demander confirmation avec mot de passe pour les actions sensibles
  const requestSecureConfirmation = (actionType: string, action: () => void) => {
    if (!hasDataManagementPermission()) {
      toast.error('Accès refusé : Seuls les administrateurs peuvent effectuer cette action');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas effectuer cette action');
      return;
    }

    setPendingAction({ type: actionType, action });
    setShowPasswordPrompt(true);
    setAdminPassword('');
  };

  // Confirmer l'action avec mot de passe
  const confirmSecureAction = () => {
    if (!verifyAdminPassword(adminPassword)) {
      toast.error('Mot de passe administrateur incorrect');
      setAdminPassword('');
      return;
    }

    if (pendingAction) {
      setShowPasswordPrompt(false);
      setShowConfirmation(pendingAction.type);
      setPendingAction(null);
      setAdminPassword('');
    }
  };

  // Supprimer toutes les données d'un type
  const resetDataType = async (dataType: string) => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas supprimer des données');
      return;
    }

    setIsLoading(true);
    try {
      const q = query(
        collection(db, dataType),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.info(`Aucune donnée ${getDataTypeLabel(dataType)} à supprimer`);
        setIsLoading(false);
        return;
      }

      // Utiliser un batch pour supprimer tous les documents
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });

      await batch.commit();

      await loadDataStats();
      toast.success(`Toutes les données ${getDataTypeLabel(dataType)} ont été supprimées`);
      setShowConfirmation(null);
    } catch (error) {
      console.error(`Erreur lors de la suppression des ${dataType}:`, error);
      toast.error(`Erreur lors de la suppression des ${getDataTypeLabel(dataType)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer toutes les données
  const resetAllData = async () => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    // Vérifier si l'utilisateur est un compte de démonstration
    if (isDemoAccount()) {
      toast.error('Les comptes de démonstration ne peuvent pas supprimer des données');
      return;
    }

    setIsLoading(true);
    try {
      const collections = ['sales', 'expenses', 'customers', 'products'];
      let totalDeleted = 0;

      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((document) => {
            batch.delete(document.ref);
          });
          await batch.commit();
          totalDeleted += snapshot.size;
        }
      }

      await loadDataStats();
      toast.success(`${totalDeleted} éléments supprimés avec succès`);
      setShowConfirmation(null);
    } catch (error) {
      console.error('Erreur lors de la suppression complète:', error);
      toast.error('Erreur lors de la suppression des données');
    } finally {
      setIsLoading(false);
    }
  };

  const getDataTypeLabel = (dataType: string) => {
    const labels: Record<string, string> = {
      sales: 'de ventes',
      expenses: 'de dépenses',
      customers: 'de clients',
      products: 'de produits'
    };
    return labels[dataType] || dataType;
  };

  const getDataTypeIcon = (dataType: string) => {
    const icons: Record<string, React.ReactNode> = {
      sales: <Receipt className="w-5 h-5" />,
      expenses: <TrendingDown className="w-5 h-5" />,
      customers: <Users className="w-5 h-5" />,
      products: <Package className="w-5 h-5" />
    };
    return icons[dataType] || <Database className="w-5 h-5" />;
  };

  const getDataTypeColor = (dataType: string) => {
    const colors: Record<string, string> = {
      sales: 'text-green-600 bg-green-50 border-green-200',
      expenses: 'text-red-600 bg-red-50 border-red-200',
      customers: 'text-blue-600 bg-blue-50 border-blue-200',
      products: 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors[dataType] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Modal de saisie du mot de passe administrateur
  const PasswordPromptModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Authentification Administrateur
          </h3>
          
          <p className="text-gray-600 mb-6">
            Cette action nécessite une authentification administrateur. 
            Veuillez saisir votre mot de passe pour continuer.
          </p>

          <div className="mb-6">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Mot de passe administrateur"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              onKeyPress={(e) => e.key === 'Enter' && confirmSecureAction()}
              autoFocus
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-700">
              Veuillez saisir votre mot de passe administrateur pour confirmer cette action.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              fullWidth 
              onClick={() => {
                setShowPasswordPrompt(false);
                setPendingAction(null);
                setAdminPassword('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="danger" 
              fullWidth 
              onClick={confirmSecureAction}
              disabled={!adminPassword.trim()}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const ConfirmationModal = ({ dataType, onConfirm, onCancel }: {
    dataType: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirmer la suppression
          </h3>
          
          <p className="text-gray-600 mb-6">
            {dataType === 'all' 
              ? 'Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.'
              : `Êtes-vous sûr de vouloir supprimer toutes les données ${getDataTypeLabel(dataType)} ? Cette action est irréversible.`
            }
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">⚠️ Attention :</p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Cette action ne peut pas être annulée</li>
                  <li>• Toutes les données seront définitivement perdues</li>
                  <li>• Assurez-vous d'avoir une sauvegarde si nécessaire</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
            <Button variant="danger" fullWidth onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  // Interface pour utilisateurs non-administrateurs
  const AccessDeniedView = () => (
    <div className="space-y-6">
      <Card>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserX className="w-10 h-10 text-red-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Accès Restreint
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            La gestion des données est réservée aux administrateurs. 
            Seuls les utilisateurs avec le rôle "Administrateur" peuvent accéder à cette section.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800 text-left">
                <p className="font-medium">Votre rôle actuel :</p>
                <p className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user?.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    user?.role === 'cashier' ? 'bg-green-100 text-green-800' :
                    user?.role === 'reader' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.role === 'manager' ? 'Gérant' :
                     user?.role === 'cashier' ? 'Caissier' :
                     user?.role === 'reader' ? 'Lecteur' :
                     user?.role || 'Utilisateur'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-gray-500">
              Contactez votre administrateur pour obtenir l'accès à cette fonctionnalité.
            </p>
          </div>
        </div>
      </Card>

      {/* Informations sur les permissions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Permissions par rôle
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <p className="font-medium text-red-900">Administrateur</p>
                <p className="text-sm text-red-700">Accès complet à la gestion des données</p>
              </div>
            </div>
            <span className="text-green-600">✓</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Gérant</p>
                <p className="text-sm text-gray-700">Accès en lecture seule aux statistiques</p>
              </div>
            </div>
            <span className="text-red-600">✗</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Caissier</p>
                <p className="text-sm text-gray-700">Aucun accès à la gestion des données</p>
              </div>
            </div>
            <span className="text-red-600">✗</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Lecteur</p>
                <p className="text-sm text-gray-700">Aucun accès à la gestion des données</p>
              </div>
            </div>
            <span className="text-red-600">✗</span>
          </div>
        </div>
      </Card>
    </div>
  );

  // Si l'utilisateur n'est pas administrateur, afficher la vue d'accès refusé
  if (!hasDataManagementPermission()) {
    return <AccessDeniedView />;
  }

  return (
    <div className="space-y-6">
      {/* Indicateur de sécurité */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800 flex items-center">
              Zone Sécurisée - Administrateur Uniquement
              <Lock className="w-4 h-4 ml-2" />
            </h4>
            <p className="text-sm text-red-700 mt-1">
              Ces actions nécessitent une double authentification et suppriment définitivement vos données. 
              Utilisez avec précaution.
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques des données */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          État actuel des données
        </h3>
        
        {loadingStats ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Chargement des statistiques...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dataStats).map(([type, count]) => (
              <div key={type} className={`p-4 rounded-lg border ${getDataTypeColor(type)}`}>
                <div className="flex items-center">
                  {getDataTypeIcon(type)}
                  <div className="ml-3">
                    <p className="text-sm font-medium capitalize">
                      {type === 'sales' ? 'Ventes' : 
                       type === 'expenses' ? 'Dépenses' :
                       type === 'customers' ? 'Clients' : 'Produits'}
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={loadDataStats} disabled={loadingStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Restriction pour les comptes de démonstration */}
      {isDemoAccount() && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <Lock className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Restriction pour les comptes de démonstration</h4>
              <p className="text-sm text-red-700 mt-1">
                Les comptes de démonstration ne peuvent pas supprimer de données.
                Cette restriction est en place pour protéger l'environnement de démonstration.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions de suppression par type */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Suppression par type de données
        </h3>
        
        <div className="space-y-4">
          {Object.entries(dataStats).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                {getDataTypeIcon(type)}
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {type === 'sales' ? 'Ventes' : 
                     type === 'expenses' ? 'Dépenses' :
                     type === 'customers' ? 'Clients' : 'Produits'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {count} élément{count > 1 ? 's' : ''} dans la base
                  </p>
                </div>
              </div>
              
              <Button
                variant="danger"
                size="sm"
                onClick={() => requestSecureConfirmation(type, () => resetDataType(type))}
                disabled={count === 0 || isLoading || isDemoAccount()}
                className={isDemoAccount() ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <Lock className="w-3 h-3 mr-1" />
                Supprimer tout
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Suppression complète */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-red-600">
          Suppression complète
        </h3>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Action irréversible</h4>
              <p className="text-sm text-red-700 mt-1">
                Cette action supprimera TOUTES vos données : ventes, dépenses, clients et produits.
                Seuls votre compte utilisateur et les paramètres de l'établissement seront conservés.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Remise à zéro complète</h4>
            <p className="text-sm text-gray-600">
              Supprime toutes les données commerciales pour repartir à zéro
            </p>
          </div>
          
          <Button
            variant="danger"
            onClick={() => requestSecureConfirmation('all', resetAllData)}
            disabled={Object.values(dataStats).every(count => count === 0) || isLoading || isDemoAccount()}
            className={isDemoAccount() ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <Lock className="w-3 h-3 mr-1" />
            Tout supprimer
          </Button>
        </div>
      </Card>

      {/* Recommandations */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Recommandations de sécurité
        </h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <p>
              <strong>Double authentification :</strong> Chaque action nécessite votre mot de passe administrateur.
            </p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <p>
              <strong>Accès restreint :</strong> Seuls les administrateurs peuvent accéder à cette section.
            </p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <p>
              <strong>Avant de supprimer :</strong> Exportez vos données importantes depuis les sections Ventes, Dépenses, etc.
            </p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <p>
              <strong>Données conservées :</strong> Votre compte, paramètres d'établissement et catégories restent intacts.
            </p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <p>
              <strong>Alternative :</strong> Créez un nouvel établissement si vous voulez conserver les données actuelles.
            </p>
          </div>
        </div>
      </Card>

      {/* Modals */}
      {showPasswordPrompt && <PasswordPromptModal />}
      
      {showConfirmation && (
        <ConfirmationModal
          dataType={showConfirmation}
          onConfirm={() => {
            if (showConfirmation === 'all') {
              resetAllData();
            } else {
              resetDataType(showConfirmation);
            }
          }}
          onCancel={() => setShowConfirmation(null)}
        />
      )}
    </div>
  );
};