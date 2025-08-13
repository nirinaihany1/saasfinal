import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  DollarSign, 
  Receipt, 
  LogOut, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Store,
  Zap,
  Tag,
  TrendingDown,
  Crown,
  CheckCircle,
  FileText,
  Building,
  ArrowLeftRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface ModernSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    path: '/', 
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiredRoles: ['admin', 'manager', 'cashier', 'reader']
  },
  { 
    id: 'pos', 
    label: 'Point de Vente', 
    path: '/pos', 
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    requiredRoles: ['admin', 'manager', 'cashier']
  },
  { 
    id: 'cash-register', 
    label: 'Caisse', 
    path: '/cash-register', 
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    requiredRoles: ['admin', 'manager', 'cashier']
  },
  { 
    id: 'products', 
    label: 'Produits', 
    path: '/products', 
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    requiredRoles: ['admin', 'manager', 'reader']
  },
  { 
    id: 'categories', 
    label: 'Catégories', 
    path: '/categories', 
    icon: Tag,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    requiredRoles: ['admin', 'manager']
  },
  { 
    id: 'stores', 
    label: 'Magasins', 
    path: '/stores', 
    icon: Building,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiredRoles: ['admin', 'manager', 'reader']
  },
  { 
    id: 'customers', 
    label: 'Clients', 
    path: '/customers', 
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    requiredRoles: ['admin', 'manager', 'reader']
  },
  { 
    id: 'sales', 
    label: 'Ventes', 
    path: '/sales', 
    icon: Receipt,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    requiredRoles: ['admin', 'manager', 'cashier', 'reader']
  },
  { 
    id: 'receipts', 
    label: 'Reçus', 
    path: '/receipts', 
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    requiredRoles: ['admin', 'manager', 'cashier', 'reader']
  },
  { 
    id: 'expenses', 
    label: 'Dépenses', 
    path: '/expenses', 
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    requiredRoles: ['admin', 'manager', 'reader']
  },
  { 
    id: 'reports', 
    label: 'Rapports', 
    path: '/reports', 
    icon: BarChart3,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    requiredRoles: ['admin', 'manager', 'reader']
  },
  { 
    id: 'settings', 
    label: 'Paramètres', 
    path: '/settings', 
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    requiredRoles: ['admin']
  }
];

// Menu pour les clients (avec abonnement)
const clientMenuItems = [
  { 
    id: 'subscription', 
    label: 'Abonnement', 
    path: '/subscription', 
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    requiredRoles: ['admin']
  }
];

// Menu Super Admin uniquement (validation des paiements)
const superAdminMenuItems = [
  { 
    id: 'admin-payments', 
    label: 'Validation Paiements', 
    path: '/admin/payments', 
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    requiredRoles: ['admin']
  }
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileToggle
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleNavigation = (path: string, label: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onMobileToggle();
    }
    toast.success(`Navigation vers ${label}`, {
      duration: 2000,
      icon: '🚀'
    });
  };

  const handleLogout = () => {
    signOut();
    toast.success('À bientôt ! Déconnexion réussie', {
      duration: 3000,
      icon: '👋'
    });
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin': 
        return { 
          label: 'Administrateur', 
          color: 'bg-gradient-to-r from-red-500 to-red-600 text-white', 
          icon: Shield,
          description: 'Accès complet'
        };
      case 'manager': 
        return { 
          label: 'Gérant', 
          color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white', 
          icon: Users,
          description: 'Gestion établissement'
        };
      case 'cashier': 
        return { 
          label: 'Caissier', 
          color: 'bg-gradient-to-r from-green-500 to-green-600 text-white', 
          icon: ShoppingCart,
          description: 'Ventes et caisse'
        };
      case 'reader': 
        return { 
          label: 'Lecteur', 
          color: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white', 
          icon: Eye,
          description: 'Consultation seule'
        };
      default: 
        return { 
          label: role, 
          color: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white', 
          icon: Users,
          description: 'Utilisateur'
        };
    }
  };

  const roleInfo = getRoleInfo(user?.role || '');
  const RoleIcon = roleInfo.icon;

  // Déterminer quels menus afficher selon le type d'utilisateur
  const getMenuItems = () => {
    // Si c'est le Super Admin système (isSystemAdmin = true)
    if (user?.isSystemAdmin === true) {
      return [...superAdminMenuItems];
    }
    
    // Si c'est un admin client ou utilisateur normal (avec establishmentId)
    if (user?.establishmentId && user?.establishmentId !== 'SYSTEM_ADMIN') {
      // Filtrer les menus selon le rôle de l'utilisateur
      const filteredMenuItems = menuItems.filter(item => 
        item.requiredRoles?.includes(user?.role || '')
      );
      
      // Ajouter le menu abonnement seulement pour les admins
      const filteredClientMenuItems = clientMenuItems.filter(item => 
        item.requiredRoles?.includes(user?.role || '')
      );
      
      return [...filteredMenuItems, ...filteredClientMenuItems];
    }
    
    return menuItems.filter(item => item.requiredRoles?.includes(user?.role || ''));
  };

  const allMenuItems = getMenuItems();

  // Déterminer le titre selon le type d'utilisateur
  const getAppTitle = () => {
    if (user?.isSystemAdmin === true) {
      return {
        title: 'SaaS POS Admin',
        subtitle: 'Système'
      };
    }
    return {
      title: 'Nirina Nirina Pos',
      subtitle: 'Madagascar'
    };
  };

  const appInfo = getAppTitle();

  // Déterminer les couleurs du sidebar selon le type d'utilisateur
  const getSidebarColors = () => {
    if (user?.isSystemAdmin === true) {
      return {
        background: 'bg-gradient-to-b from-gray-900 to-gray-800',
        border: 'border-gray-700',
        header: 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900',
        text: 'text-gray-300',
        hoverBg: 'hover:bg-gray-700',
        hoverText: 'hover:text-white',
        activeText: 'text-white',
        activeBg: 'bg-gray-700',
        activeBorder: 'border-gray-600',
        iconText: 'text-gray-400',
        iconHover: 'group-hover:text-white',
        titleGradient: 'from-gray-200 to-gray-100',
        subtitleText: 'text-gray-400',
        userProfileBg: 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900',
        userCardBg: 'bg-gray-700 border-gray-600',
        userCardText: 'text-white',
        userCardSubtext: 'text-gray-400',
        userBadgeBg: 'bg-red-600',
        userBadgeText: 'text-red-100',
        logoutText: 'text-gray-300',
        logoutHoverBg: 'hover:bg-gray-700',
        logoutHoverText: 'hover:text-white'
      };
    }
    
    return {
      background: 'bg-white',
      border: 'border-gray-200',
      header: 'border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50',
      text: 'text-gray-600',
      hoverBg: 'hover:bg-gray-100',
      hoverText: 'hover:text-gray-900',
      activeText: 'text-blue-600',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-blue-200',
      iconText: 'text-gray-400',
      iconHover: 'group-hover:text-blue-600',
      titleGradient: 'from-blue-600 to-blue-800',
      subtitleText: 'text-gray-500',
      userProfileBg: 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100',
      userCardBg: 'bg-white border-gray-100',
      userCardText: 'text-gray-900',
      userCardSubtext: 'text-gray-500',
      userBadgeBg: 'bg-blue-100',
      userBadgeText: 'text-blue-800',
      logoutText: 'text-red-600',
      logoutHoverBg: 'hover:bg-red-50',
      logoutHoverText: 'hover:text-red-700'
    };
  };

  const sidebarColors = getSidebarColors();

  // Confirmation de déconnexion
  const LogoutConfirmation = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer la déconnexion</h3>
        <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir vous déconnecter ?</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              setShowLogoutConfirm(false);
              handleLogout();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 ${
        sidebarColors.background
      } ${sidebarColors.border} shadow-xl transition-all duration-300 z-30 ${
        collapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          sidebarColors.header
        }`}>
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform overflow-hidden">
                {user?.isSystemAdmin === true ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <>
                    <img 
                      src="/nirina.jpg" 
                      alt="Logo Nirina Nirina Pos" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                  </>
                )}
              </div>
              <div>
                <h1 className={`text-lg font-bold bg-gradient-to-r ${
                  sidebarColors.titleGradient
                } text-transparent bg-clip-text`}>
                  {appInfo.title}
                </h1>
                <p className={`text-xs font-medium ${
                  sidebarColors.subtitleText
                }`}>
                  {appInfo.subtitle}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-lg transition-all duration-200 group ${
              sidebarColors.hoverBg
            } hover:shadow-md`}
            title={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            {collapsed ? (
              <ChevronRight className={`w-5 h-5 transition-colors ${
                sidebarColors.iconText
              } ${sidebarColors.iconHover}`} />
            ) : (
              <ChevronLeft className={`w-5 h-5 transition-colors ${
                sidebarColors.iconText
              } ${sidebarColors.iconHover}`} />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.label)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? `${sidebarColors.activeBg} ${sidebarColors.activeText} shadow-md border ${sidebarColors.activeBorder} transform scale-105`
                    : `${sidebarColors.text} ${sidebarColors.hoverBg} ${sidebarColors.hoverText} hover:shadow-sm`
                }`}
                title={collapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                  active 
                    ? `${sidebarColors.activeText} transform scale-110`
                    : `${sidebarColors.iconText} ${sidebarColors.iconHover} group-hover:scale-105`
                }`} />
                {!collapsed && (
                  <span className="font-medium text-sm transition-all duration-200">{item.label}</span>
                )}
                {active && !collapsed && (
                  <div className="ml-auto">
                    <Zap className="w-4 h-4 text-current opacity-60" />
                  </div>
                )}
                {active && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-current rounded-r-full opacity-80" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className={`p-4 border-t ${sidebarColors.userProfileBg}`}>
          {!collapsed ? (
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 rounded-xl shadow-sm border ${
                sidebarColors.userCardBg
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                  user?.isSystemAdmin === true
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    : roleInfo.color
                }`}>
                  {user?.isSystemAdmin === true ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <RoleIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${sidebarColors.userCardText}`}>
                    {user?.name}
                  </p>
                  <p className={`text-xs truncate ${sidebarColors.userCardSubtext}`}>
                    {user?.isSystemAdmin === true ? 'Super Admin Système' : roleInfo.description}
                  </p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                    user?.isSystemAdmin === true
                      ? 'bg-red-600 text-red-100'
                      : `${sidebarColors.userBadgeBg} ${sidebarColors.userBadgeText}`
                  }`}>
                    {user?.isSystemAdmin === true ? 'Super Admin' : roleInfo.label}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group hover:shadow-sm ${
                  sidebarColors.logoutText
                } ${sidebarColors.logoutHoverBg} ${sidebarColors.logoutHoverText}`}
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto shadow-md ${
                user?.isSystemAdmin === true
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : roleInfo.color
              }`}>
                {user?.isSystemAdmin === true ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <RoleIcon className="w-5 h-5" />
                )}
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full p-2 rounded-lg transition-all duration-200 hover:shadow-sm ${
                  sidebarColors.logoutText
                } ${sidebarColors.logoutHoverBg} ${sidebarColors.logoutHoverText}`}
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5 mx-auto hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 ${
        sidebarColors.background
      } ${sidebarColors.border} shadow-2xl transform transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Mobile Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          sidebarColors.header
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              {user?.isSystemAdmin === true ? (
                <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              ) : (
                <>
                  <img 
                    src="/nirina.jpg" 
                    alt="Logo Nirina Nirina Pos" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                </>
              )}
            </div>
            <div>
              <h1 className={`text-lg font-bold bg-gradient-to-r ${
                sidebarColors.titleGradient
              } text-transparent bg-clip-text`}>
                {appInfo.title}
              </h1>
              <p className={`text-xs font-medium ${
                sidebarColors.subtitleText
              }`}>
                {appInfo.subtitle}
              </p>
            </div>
          </div>
          
          <button
            onClick={onMobileToggle}
            className={`p-2 rounded-lg transition-all duration-200 ${
              sidebarColors.hoverBg
            } hover:shadow-md`}
          >
            <ChevronLeft className={`w-5 h-5 ${
              sidebarColors.iconText
            }`} />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.label)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
                  active
                    ? `${sidebarColors.activeBg} ${sidebarColors.activeText} shadow-md border ${sidebarColors.activeBorder}`
                    : `${sidebarColors.text} ${sidebarColors.hoverBg} ${sidebarColors.hoverText} hover:shadow-sm`
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${
                  active 
                    ? `${sidebarColors.activeText} transform scale-110`
                    : sidebarColors.iconText
                }`} />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto">
                    <Zap className="w-4 h-4 text-current opacity-60" />
                  </div>
                )}
                {active && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-current rounded-r-full opacity-80" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile User Profile */}
        <div className={`p-4 border-t ${sidebarColors.userProfileBg}`}>
          <div className="space-y-3">
            <div className={`flex items-center space-x-3 p-3 rounded-xl shadow-sm border ${
              sidebarColors.userCardBg
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                user?.isSystemAdmin === true
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : roleInfo.color
              }`}>
                {user?.isSystemAdmin === true ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <RoleIcon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${sidebarColors.userCardText}`}>
                  {user?.name}
                </p>
                <p className={`text-xs truncate ${sidebarColors.userCardSubtext}`}>
                  {user?.isSystemAdmin === true ? 'Super Admin Système' : roleInfo.description}
                </p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                  user?.isSystemAdmin === true
                    ? 'bg-red-600 text-red-100'
                    : `${sidebarColors.userBadgeBg} ${sidebarColors.userBadgeText}`
                }`}>
                  {user?.isSystemAdmin === true ? 'Super Admin' : roleInfo.label}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 hover:shadow-sm ${
                sidebarColors.logoutText
              } ${sidebarColors.logoutHoverBg} ${sidebarColors.logoutHoverText}`}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && <LogoutConfirmation />}
    </>
  );
};