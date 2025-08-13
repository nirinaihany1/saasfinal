import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Search, 
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Shield,
  Users,
  ShoppingCart,
  BarChart3,
  Store
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface TopBarProps {
  onMenuToggle: () => void;
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
}

const pageNames: Record<string, string> = {
  '/': 'Tableau de bord',
  '/pos': 'Point de Vente',
  '/cash-register': 'Gestion de Caisse',
  '/products': 'Gestion des Produits',
  '/categories': 'Gestion des Catégories',
  '/stores': 'Gestion des Magasins',
  '/customers': 'Gestion des Clients',
  '/sales': 'Historique des Ventes',
  '/receipts': 'Historique des Reçus',
  '/expenses': 'Gestion des Dépenses',
  '/reports': 'Rapports & Analytics',
  '/settings': 'Paramètres',
  '/subscription': 'Gestion de l\'Abonnement',
  '/admin/payments': 'Validation des Paiements'
};

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, onSidebarToggle, sidebarCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const currentPageName = pageNames[location.pathname] || 'Page';

  const notifications = [
    { id: 1, type: 'warning', message: 'Stock faible: Coca Cola 50cl (5 restants)', time: '5 min' },
    { id: 2, type: 'info', message: 'Nouvelle vente: 15,800 Ar', time: '12 min' },
    { id: 3, type: 'success', message: 'Sauvegarde automatique effectuée', time: '1h' }
  ];

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin': 
        return { label: 'Administrateur', color: 'bg-red-100 text-red-800', icon: Shield };
      case 'manager': 
        return { label: 'Gérant', color: 'bg-blue-100 text-blue-800', icon: Users };
      case 'cashier': 
        return { label: 'Caissier', color: 'bg-green-100 text-green-800', icon: ShoppingCart };
      case 'reader': 
        return { label: 'Lecteur', color: 'bg-purple-100 text-purple-800', icon: BarChart3 };
      default: 
        return { label: role, color: 'bg-gray-100 text-gray-800', icon: User };
    }
  };

  const roleInfo = getRoleInfo(user?.role || '');
  const RoleIcon = roleInfo.icon;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      toast.success(`Recherche: "${searchTerm}"`);
      // Implement global search logic here
    }
  };

  const handleLogout = () => {
    signOut();
    setShowUserMenu(false);
    toast.success('Déconnexion réussie');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-orange-500 bg-orange-50';
      case 'info': return 'border-l-blue-500 bg-blue-50';
      case 'success': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative z-20">
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Réduire/Étendre le menu"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          {/* Page Title */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{currentPageName}</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher produits, clients, ventes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`px-4 py-3 border-l-4 ${getNotificationColor(notification.type)} hover:bg-gray-50 cursor-pointer`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">Il y a {notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Voir toutes les notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Settings */}
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <RoleIcon className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <RoleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user?.name}</p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${roleInfo.color} mt-1`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Paramètres du compte</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-6 pb-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>
      </div>

      {/* Click outside handlers */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};