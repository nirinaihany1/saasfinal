import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FirebaseIndexHelper } from '../ui/FirebaseIndexHelper';

export const StatsCards: React.FC = () => {
  const [stats, setStats] = useState({
    dailySales: 0,
    totalProfit: 0,
    products: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);
  
  const { user } = useAuthStore();

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.establishmentId) return;
      
      setIsLoading(true);
      setIndexError(false);
      
      try {
        // Obtenir la date de début de la journée
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Charger les ventes du jour avec gestion d'erreur d'index
        let dailySales = 0;
        let totalProfit = 0;
        
        try {
          const salesQuery = query(
            collection(db, 'sales'),
            where('establishmentId', '==', user.establishmentId),
            where('status', '==', 'completed'),
            where('createdAt', '>=', Timestamp.fromDate(today))
          );
          
          const salesSnapshot = await getDocs(salesQuery);
          dailySales = salesSnapshot.docs.reduce((sum, doc) => sum + doc.data().total, 0);
          
          // Calculer le bénéfice total (prix de vente - prix d'achat)
          for (const saleDoc of salesSnapshot.docs) {
            const saleData = saleDoc.data();
            if (saleData.items && Array.isArray(saleData.items)) {
              for (const item of saleData.items) {
                try {
                  const productRef = doc(db, 'products', item.productId);
                  const productDoc = await getDoc(productRef);
                  if (productDoc.exists()) {
                    const productData = productDoc.data();
                    const purchasePrice = productData.purchasePrice || 0;
                    const salePrice = item.unitPrice;
                    const quantity = item.quantity;
                    // Bénéfice = (Prix de vente - Prix d'achat) × Quantité
                    const itemProfit = (salePrice - purchasePrice) * quantity;
                    totalProfit += itemProfit;
                  }
                } catch (productError) {
                  console.warn('Erreur lors de la récupération du produit:', item.productId);
                }
              }
            }
          }
        } catch (error: any) {
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
            setIndexError(true);
            console.warn('Index composite requis pour les ventes. Chargement des données alternatives...');
            
            // Fallback: charger toutes les ventes de l'établissement et filtrer côté client
            const fallbackSalesQuery = query(
              collection(db, 'sales'),
              where('establishmentId', '==', user.establishmentId)
            );
            
            const fallbackSnapshot = await getDocs(fallbackSalesQuery);
            const todayTimestamp = Timestamp.fromDate(today);
            
            const todaySales = fallbackSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.status === 'completed' && 
                     data.createdAt && 
                     data.createdAt.toMillis() >= todayTimestamp.toMillis();
            });
            
            dailySales = todaySales.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
            
            // Calculer le bénéfice pour le fallback
            for (const saleDoc of todaySales) {
              const saleData = saleDoc.data();
              if (saleData.items && Array.isArray(saleData.items)) {
                for (const item of saleData.items) {
                  try {
                    const productRef = doc(db, 'products', item.productId);
                    const productDoc = await getDoc(productRef);
                    if (productDoc.exists()) {
                      const productData = productDoc.data();
                      const purchasePrice = productData.purchasePrice || 0;
                      const salePrice = item.unitPrice;
                      const quantity = item.quantity;
                      // Bénéfice = (Prix de vente - Prix d'achat) × Quantité
                      const itemProfit = (salePrice - purchasePrice) * quantity;
                      totalProfit += itemProfit;
                    }
                  } catch (productError) {
                    console.warn('Erreur lors de la récupération du produit:', item.productId);
                  }
                }
              }
            }
          } else {
            throw error;
          }
        }
        
        // Charger le nombre de produits
        const productsQuery = query(
          collection(db, 'products'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        const products = productsSnapshot.size;
        
        setStats({
          dailySales,
          totalProfit,
          products
        });
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, [user?.establishmentId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} padding="md">
            <div className="animate-pulse flex items-center">
              <div className="p-3 rounded-lg bg-gray-200 mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {indexError && (
        <FirebaseIndexHelper 
          indexUrl="https://console.firebase.google.com/v1/r/project/saas-915ec/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9zYWFzLTkxNWVjL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zYWxlcy9pbmRleGVzL18QARoTCg9lc3RhYmxpc2htZW50SWQQARoKCgZzdGF0dXMQARoNCgljcmVhdGVkQXQQARoMCghfX25hbWVfXxAB"
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Ventes du jour</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.dailySales)}</p>
                <div className="ml-2 flex items-center text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="ml-1">+12.5%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Total Bénéfices</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalProfit)}</p>
                <div className="ml-2 flex items-center text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="ml-1">+8.2%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>


        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Produits en stock</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{stats.products}</p>
                <div className="ml-2 flex items-center text-sm text-red-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="ml-1">-3.2%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};