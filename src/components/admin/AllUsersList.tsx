import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Filter,
  User,
  Building,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  Clock,
  Download,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Input } from '../ui/Input';

export const AllUsersList: React.FC = () => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedEstablishment, setSelectedEstablishment] = useState('all');
  const [establishments, setEstablishments] = useState<{id: string, name: string}[]>([]);
  const [expandedEstablishments, setExpandedEstablishments] = useState<Record<string, boolean>>({});
  
  const { user: currentUser } = useAuthStore();

  // Vérifier si l'utilisateur actuel est un Super Admin
  const isSuperAdmin = currentUser?.isSystemAdmin === true;

  // Charger tous les utilisateurs sans filtrage
  const loadAllUsers = async () => {
    if (!isSuperAdmin) return;

    try {
      setIsLoading(true);
      
      // Requête sans filtres pour obtenir tous les utilisateurs
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name || 'Sans nom',
          role: data.role || 'inconnu',
          establishmentId: data.establishmentId || 'inconnu',
          establishmentName: data.establishmentId === 'SYSTEM_ADMIN' ? 'Système' : data.establishmentId,
          isActive: data.isActive ?? true,
          isSuperAdmin: data.isSuperAdmin ?? false,
          isSystemAdmin: data.isSystemAdmin ?? false,
          isClientAdmin: data.isClientAdmin ?? false,
          lastLogin: data.lastLogin?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      
      setAllUsers(usersData);
      
      // Extraire les établissements uniques
      const uniqueEstablishments = Array.from(new Set(usersData.map(user => user.establishmentId)))
        .map(estId => {
          const users = usersData.filter(u => u.establishmentId === estId);
          const estName = estId === 'SYSTEM_ADMIN' ? 'Système' : 
                         estId === 'demo-establishment-main' ? 'Établissement Démo' : 
                         `Établissement ${estId.substring(0, 8)}`;
          return { id: estId, name: estName };
        });
      
      setEstablishments(uniqueEstablishments);
      
      // Initialiser tous les établissements comme développés par défaut
      const initialExpandedState: Record<string, boolean> = {};
      uniqueEstablishments.forEach(est => {
        initialExpandedState[est.id] = true;
      });
      setExpandedEstablishments(initialExpandedState);
      
      toast.success(`${usersData.length} utilisateurs trouvés`);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllUsers();
    }
  }, [isSuperAdmin]);

  // Filtrer les utilisateurs selon les critères
  const filteredUsers = allUsers.filter(user => {
    // Filtrer par recherche
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.establishmentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrer par rôle
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    // Filtrer par établissement
    const matchesEstablishment = selectedEstablishment === 'all' || user.establishmentId === selectedEstablishment;
    
    return matchesSearch && matchesRole && matchesEstablishment;
  });

  // Obtenir la couleur de la carte selon le rôle
  const getUserCardColor = (user: any) => {
    if (user.isSystemAdmin) {
      return 'bg-red-50 border-red-200';
    } else if (user.role === 'admin' || user.isClientAdmin) {
      return 'bg-blue-50 border-blue-200';
    } else if (user.role === 'manager') {
      return 'bg-green-50 border-green-200';
    } else if (user.role === 'cashier') {
      return 'bg-yellow-50 border-yellow-200';
    } else if (user.role === 'reader') {
      return 'bg-purple-50 border-purple-200';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  // Obtenir le badge selon le rôle
  const getUserRoleBadge = (user: any) => {
    if (user.isSystemAdmin) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Super Admin Système
        </span>
      );
    } else if (user.isClientAdmin) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Admin Client
        </span>
      );
    } else if (user.role === 'admin') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Administrateur
        </span>
      );
    } else if (user.role === 'manager') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Gérant
        </span>
      );
    } else if (user.role === 'cashier') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Caissier
        </span>
      );
    } else if (user.role === 'reader') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
          Lecteur
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          {user.role || 'Rôle inconnu'}
        </span>
      );
    }
  };

  // Obtenir l'icône selon le rôle
  const getUserRoleIcon = (user: any) => {
    if (user.isSystemAdmin) {
      return <Shield className="w-5 h-5 text-red-600" />;
    } else if (user.role === 'admin' || user.isClientAdmin) {
      return <Shield className="w-5 h-5 text-blue-600" />;
    } else if (user.role === 'manager') {
      return <User className="w-5 h-5 text-green-600" />;
    } else if (user.role === 'cashier') {
      return <User className="w-5 h-5 text-yellow-600" />;
    } else if (user.role === 'reader') {
      return <Eye className="w-5 h-5 text-purple-600" />;
    } else {
      return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  // Grouper les utilisateurs par établissement
  const getUsersByEstablishment = () => {
    const groupedUsers: Record<string, any[]> = {};
    
    filteredUsers.forEach(user => {
      if (!groupedUsers[user.establishmentId]) {
        groupedUsers[user.establishmentId] = [];
      }
      groupedUsers[user.establishmentId].push(user);
    });
    
    return groupedUsers;
  };

  // Obtenir le nom de l'établissement
  const getEstablishmentName = (establishmentId: string) => {
    const establishment = establishments.find(e => e.id === establishmentId);
    return establishment?.name || establishmentId;
  };

  // Obtenir la couleur de l'établissement
  const getEstablishmentColor = (establishmentId: string) => {
    if (establishmentId === 'SYSTEM_ADMIN') {
      return 'bg-red-100 border-red-200 text-red-800';
    } else if (establishmentId === 'demo-establishment-main') {
      return 'bg-blue-100 border-blue-200 text-blue-800';
    } else {
      return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  // Basculer l'état d'expansion d'un établissement
  const toggleEstablishmentExpansion = (establishmentId: string) => {
    setExpandedEstablishments(prev => ({
      ...prev,
      [establishmentId]: !prev[establishmentId]
    }));
  };

  const exportUsersList = () => {
    const csvContent = [
      ['ID', 'Nom', 'Email', 'Rôle', 'Établissement', 'Statut', 'Dernière connexion', 'Créé le'],
      ...filteredUsers.map(user => [
        user.id,
        user.name,
        user.email,
        user.role,
        user.establishmentId,
        user.isActive ? 'Actif' : 'Inactif',
        user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : 'Jamais',
        user.createdAt.toLocaleDateString('fr-FR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Liste des utilisateurs exportée avec succès');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Liste complète des utilisateurs
        </h3>
        <div className="flex gap-2">
          <Button 
            onClick={loadAllUsers} 
            variant="ghost"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            onClick={exportUsersList} 
            variant="ghost"
            disabled={isLoading || filteredUsers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Explication */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Liste complète des utilisateurs</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Cette liste affiche <strong>tous</strong> les utilisateurs du système, organisés par établissement</p>
                <p>• Les Super Admins Système sont marqués en rouge</p>
                <p>• Les Admins Clients sont marqués en bleu</p>
                <p>• Les Gérants sont marqués en vert</p>
                <p>• Les Caissiers sont marqués en jaune</p>
                <p>• Les Lecteurs sont marqués en violet</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filtres */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Input
                placeholder="Rechercher par nom, email ou établissement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="manager">Gérants</option>
              <option value="cashier">Caissiers</option>
              <option value="reader">Lecteurs</option>
            </select>
            
            <select
              value={selectedEstablishment}
              onChange={(e) => setSelectedEstablishment(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filtres actifs</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des utilisateurs par établissement */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des utilisateurs...</p>
            </div>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-gray-500">Aucun utilisateur ne correspond à vos critères de recherche</p>
            </div>
          </Card>
        ) : (
          Object.entries(getUsersByEstablishment()).map(([establishmentId, users]) => (
            <Card key={establishmentId} className="overflow-hidden">
              {/* En-tête de l'établissement */}
              <div 
                className={`p-4 ${getEstablishmentColor(establishmentId)} cursor-pointer`}
                onClick={() => toggleEstablishmentExpansion(establishmentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5" />
                    <div>
                      <h4 className="font-semibold">{getEstablishmentName(establishmentId)}</h4>
                      <p className="text-sm">{users.length} utilisateur(s)</p>
                    </div>
                  </div>
                  {expandedEstablishments[establishmentId] ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              {/* Liste des utilisateurs de l'établissement */}
              {expandedEstablishments[establishmentId] && (
                <div className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <div key={user.id} className={`p-4 ${getUserCardColor(user)}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-200 flex-shrink-0">
                            {getUserRoleIcon(user)}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900">{user.name}</h4>
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3 h-3 text-gray-500" />
                              <p className="text-sm text-gray-600 font-mono truncate max-w-[200px] sm:max-w-none">{user.email}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {getUserRoleBadge(user)}
                              
                              {user.isActive ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Inactif
                                </span>
                              )}
                              
                              {user.id === currentUser?.id && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                  Vous-même
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {user.lastLogin 
                                ? `Dernière connexion: ${user.lastLogin.toLocaleDateString('fr-FR')}` 
                                : 'Jamais connecté'}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>Créé le: {user.createdAt.toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Statistiques */}
      <Card>
        <h4 className="text-md font-semibold text-gray-900 mb-4">Statistiques des utilisateurs</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-800">{allUsers.length}</div>
            <div className="text-sm text-blue-600">Total utilisateurs</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-800">
              {allUsers.filter(u => u.isSystemAdmin).length}
            </div>
            <div className="text-sm text-red-600">Super Admins</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-800">
              {establishments.length}
            </div>
            <div className="text-sm text-green-600">Établissements</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-lg font-bold text-yellow-800">
              {allUsers.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-yellow-600">Utilisateurs actifs</div>
          </div>
        </div>
      </Card>
    </div>
  );
};