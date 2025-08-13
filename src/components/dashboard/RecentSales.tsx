import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FirebaseIndexHelper } from '../ui/FirebaseIndexHelper';

interface RecentSale {
  id: string;
  customer: string;
  amount: string;
  time: string;
  method: string;
}

export const RecentSales: React.FC = () => {
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadRecentSales = async () => {
      if (!user?.establishmentId) return;
      
      setIsLoading(true);
      setIndexError(false);
      
      try {
        // Obtenir la date de début de la journée
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        try {
          const q = query(
            collection(db, 'sales'),
            where('establishmentId', '==', user.establishmentId),
            where('status', '==', 'completed'),
            where('createdAt', '>=', Timestamp.fromDate(today)),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            setRecentSales([]);
            setIsLoading(false);
            return;
          }
          
          const salesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id.substring(doc.id.length - 3), // Juste les 3 derniers caractères pour l'affichage
              customer: data.customerName || 'Client anonyme',
              amount: new Intl.NumberFormat('mg-MG', {
                style: 'currency',
                currency: 'MGA',
                minimumFractionDigits: 0
              }).format(data.total).replace('MGA', 'Ar'),
              time: data.createdAt.toDate().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              method: data.paymentMethod === 'cash' ? 'Espèces' :
                      data.paymentMethod === 'card' ? 'Carte' :
                      data.paymentMethod === 'mvola' ? 'MVola' :
                      data.paymentMethod === 'orange_money' ? 'Orange Money' :
                      data.paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Autre'
            };
          });
          
          setRecentSales(salesData);
        } catch (error: any) {
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
            setIndexError(true);
            console.warn('Index composite requis pour les ventes récentes. Chargement des données alternatives...');
            
            // Fallback: charger toutes les ventes de l'établissement et filtrer côté client
            const fallbackQuery = query(
              collection(db, 'sales'),
              where('establishmentId', '==', user.establishmentId)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const todayTimestamp = Timestamp.fromDate(today);
            
            const todaySales = fallbackSnapshot.docs
              .filter(doc => {
                const data = doc.data();
                return data.status === 'completed' && 
                       data.createdAt && 
                       data.createdAt.toMillis() >= todayTimestamp.toMillis();
              })
              .sort((a, b) => {
                return b.data().createdAt.toMillis() - a.data().createdAt.toMillis();
              })
              .slice(0, 5);
            
            if (todaySales.length === 0) {
              setRecentSales([]);
              setIsLoading(false);
              return;
            }
            
            const salesData = todaySales.map(doc => {
              const data = doc.data();
              return {
                id: doc.id.substring(doc.id.length - 3),
                customer: data.customerName || 'Client anonyme',
                amount: new Intl.NumberFormat('mg-MG', {
                  style: 'currency',
                  currency: 'MGA',
                  minimumFractionDigits: 0
                }).format(data.total).replace('MGA', 'Ar'),
                time: data.createdAt.toDate().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                method: data.paymentMethod === 'cash' ? 'Espèces' :
                        data.paymentMethod === 'card' ? 'Carte' :
                        data.paymentMethod === 'mvola' ? 'MVola' :
                        data.paymentMethod === 'orange_money' ? 'Orange Money' :
                        data.paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Autre'
              };
            });
            
            setRecentSales(salesData);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des ventes récentes:', error);
        setRecentSales([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecentSales();
  }, [user?.establishmentId]);

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventes récentes</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Ventes récentes</h3>
      
      {indexError && (
        <div className="mb-4">
          <FirebaseIndexHelper 
            indexUrl="https://console.firebase.google.com/v1/r/project/saas-915ec/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9zYWFzLTkxNWVjL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zYWxlcy9pbmRleGVzL18QARoTCg9lc3RhYmxpc2htZW50SWQQARoKCgZzdGF0dXMQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC"
          />
        </div>
      )}
      
      {recentSales.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune vente aujourd'hui</p>
          <p className="text-sm text-gray-400 mt-1">Les ventes du jour apparaîtront ici</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">#{sale.id}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sale.customer}</p>
                    <p className="text-sm text-gray-500">{sale.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{sale.amount}</p>
                  <p className="text-sm text-gray-500">{sale.method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};