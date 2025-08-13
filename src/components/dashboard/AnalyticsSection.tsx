import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Users, 
  Eye, 
  PieChart, 
  Activity,
  Star,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Clock,
  Package,
  Tag
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TopClient {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  country: string;
  avatar: string;
}

interface CategorySales {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ActivityData {
  hour: number;
  day: number;
  intensity: number;
}

export const AnalyticsSection: React.FC = () => {
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const { user } = useAuthStore();

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user?.establishmentId) return;
      
      setIsLoading(true);
      try {
        // Charger les clients avec leurs statistiques
        await loadTopClients();
        
        // Charger les données de ventes par catégorie
        await loadCategorySales();
        
        // Générer les données d'activité (simulation pour la démo)
        generateActivityData();
        
      } catch (error) {
        console.error('Erreur lors du chargement des analyses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [user?.establishmentId]);

  const loadTopClients = async () => {
    if (!user?.establishmentId) return;

    try {
      const q = query(
        collection(db, 'customers'),
        where('establishmentId', '==', user.establishmentId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email || '',
          orderCount: Math.floor(Math.random() * 15) + 1, // Simulation
          totalSpent: data.totalSpent || 0,
          country: 'Madagascar',
          avatar: getAvatarForName(data.name)
        } as TopClient;
      });

      // Trier par montant total dépensé et prendre les 5 premiers
      const sortedClients = clientsData
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setTopClients(sortedClients);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const loadCategorySales = async () => {
    if (!user?.establishmentId) return;

    try {
      // Charger les catégories
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        color: doc.data().color
      }));

      setTotalCategories(categories.length);

      // Charger les produits pour compter le total
      const productsQuery = query(
        collection(db, 'products'),
        where('establishmentId', '==', user.establishmentId),
        where('isActive', '==', true)
      );
      
      const productsSnapshot = await getDocs(productsQuery);
      setTotalProducts(productsSnapshot.size);

      // Simuler les données de ventes par catégorie
      const categoryColors = ['blue', 'green', 'purple', 'orange', 'red', 'yellow'];
      const salesData = categories.map((category, index) => ({
        category: category.name,
        amount: Math.floor(Math.random() * 500000) + 50000,
        percentage: 0, // Sera calculé après
        color: categoryColors[index % categoryColors.length]
      }));

      // Calculer les pourcentages
      const totalAmount = salesData.reduce((sum, item) => sum + item.amount, 0);
      const salesWithPercentages = salesData.map(item => ({
        ...item,
        percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
      }));

      setCategorySales(salesWithPercentages);
    } catch (error) {
      console.error('Erreur lors du chargement des ventes par catégorie:', error);
    }
  };

  const generateActivityData = () => {
    // Générer une heatmap d'activité simulée (7 jours x 24 heures)
    const data: ActivityData[] = [];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Simuler plus d'activité pendant les heures d'ouverture (8h-20h)
        let intensity = 0;
        if (hour >= 8 && hour <= 20) {
          // Pics d'activité à 12h et 18h
          if (hour === 12 || hour === 18) {
            intensity = Math.random() * 0.4 + 0.6; // 60-100%
          } else if (hour >= 10 && hour <= 16) {
            intensity = Math.random() * 0.3 + 0.3; // 30-60%
          } else {
            intensity = Math.random() * 0.2 + 0.1; // 10-30%
          }
        } else {
          intensity = Math.random() * 0.1; // 0-10%
        }
        
        data.push({ hour, day, intensity });
      }
    }
    
    setActivityData(data);
  };

  const getAvatarForName = (name: string) => {
    const avatars = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻', '👨‍🔬', '👩‍🔬'];
    const index = name.length % avatars.length;
    return avatars[index];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[dayIndex];
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 0.8) return 'bg-blue-600';
    if (intensity >= 0.6) return 'bg-blue-500';
    if (intensity >= 0.4) return 'bg-blue-400';
    if (intensity >= 0.2) return 'bg-blue-300';
    if (intensity >= 0.1) return 'bg-blue-200';
    return 'bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Analyses & Statistiques</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} padding="md">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Analyses & Statistiques</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 - Top Clients */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Top Clients
            </h3>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Voir tout
            </Button>
          </div>
          
          <div className="space-y-3">
            {topClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun client trouvé</p>
                <p className="text-gray-400 text-xs">Les meilleurs clients apparaîtront ici</p>
              </div>
            ) : (
              topClients.map((client, index) => (
                <div key={client.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{client.avatar}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      {index < 3 && (
                        <Star className="w-3 h-3 text-yellow-500 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>🇲🇬 {client.country}</span>
                      <span className="mx-1">•</span>
                      <span>{client.orderCount} commandes</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">
                      {formatCurrency(client.totalSpent)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Colonne 2 - Répartition des Ventes */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-purple-600" />
              Répartition des Ventes
            </h3>
          </div>
          
          {categorySales.length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucune donnée de vente</p>
              <p className="text-gray-400 text-xs">Les ventes par catégorie apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Graphique en anneau simulé */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="w-32 h-32 rounded-full border-8 border-gray-200 relative overflow-hidden">
                  {categorySales.map((item, index) => {
                    const colors = {
                      blue: 'border-blue-500',
                      green: 'border-green-500',
                      purple: 'border-purple-500',
                      orange: 'border-orange-500',
                      red: 'border-red-500',
                      yellow: 'border-yellow-500'
                    };
                    
                    return (
                      <div
                        key={index}
                        className={`absolute inset-0 rounded-full border-4 ${colors[item.color as keyof typeof colors] || 'border-gray-500'}`}
                        style={{
                          clipPath: `polygon(50% 50%, 50% 0%, ${50 + (item.percentage / 100) * 50}% 0%, 50% 50%)`
                        }}
                      />
                    );
                  })}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-sm font-bold text-gray-900">{categorySales.length}</p>
                  </div>
                </div>
              </div>

              {/* Légende */}
              <div className="space-y-2">
                {categorySales.slice(0, 4).map((item, index) => {
                  const colorClasses = {
                    blue: 'bg-blue-500',
                    green: 'bg-green-500',
                    purple: 'bg-purple-500',
                    orange: 'bg-orange-500',
                    red: 'bg-red-500',
                    yellow: 'bg-yellow-500'
                  };
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colorClasses[item.color as keyof typeof colorClasses] || 'bg-gray-500'}`}></div>
                        <span className="text-sm text-gray-700 truncate">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{item.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Statistiques */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Tag className="w-4 h-4 text-purple-600 mr-1" />
                      <span className="text-2xl font-bold text-purple-600">{totalCategories}</span>
                    </div>
                    <p className="text-xs text-gray-600">Catégories</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Package className="w-4 h-4 text-blue-600 mr-1" />
                      <span className="text-2xl font-bold text-blue-600">{totalProducts}</span>
                    </div>
                    <p className="text-xs text-gray-600">Produits</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Colonne 3 - Activité des Commandes */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              Activité des Commandes
            </h3>
          </div>
          
          <div className="space-y-4">
            {/* Heatmap */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Intensité par jour et heure</p>
              
              {/* En-têtes des heures */}
              <div className="grid grid-cols-13 gap-1 mb-2">
                <div className="text-xs text-gray-500"></div>
                {[0, 6, 12, 18].map(hour => (
                  <div key={hour} className="text-xs text-gray-500 text-center col-span-3">
                    {hour}h
                  </div>
                ))}
              </div>
              
              {/* Grille heatmap */}
              <div className="space-y-1">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <div key={day} className="grid grid-cols-13 gap-1">
                    <div className="text-xs text-gray-500 flex items-center">
                      {getDayName(day)}
                    </div>
                    {[...Array(12)].map((_, hourIndex) => {
                      const hour = hourIndex * 2;
                      const activity = activityData.find(a => a.day === day && a.hour === hour);
                      const intensity = activity?.intensity || 0;
                      
                      return (
                        <div
                          key={hourIndex}
                          className={`w-4 h-4 rounded-sm ${getIntensityColor(intensity)} transition-all hover:scale-110`}
                          title={`${getDayName(day)} ${hour}h: ${Math.round(intensity * 100)}% d'activité`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Légende */}
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>Moins</span>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                  <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                </div>
                <span>Plus</span>
              </div>
            </div>

            {/* Statistiques d'activité */}
            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">Pic d'activité</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">12h - 14h</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">Jour le plus actif</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">Vendredi</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-700">Tendance</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-600">+15.3%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};