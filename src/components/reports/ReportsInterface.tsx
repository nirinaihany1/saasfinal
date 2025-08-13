import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
  Filter,
  Eye,
  FileText,
  PieChart,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Search,
  CreditCard
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { FirebaseIndexHelper } from '../ui/FirebaseIndexHelper';

interface ReportData {
  period: string;
  sales: number;
  transactions: number;
  customers: number;
  avgTicket: number;
}

interface SalesSummaryItem {
  productId: string;
  productName: string;
  quantity: number;
  totalSales: number;
  costPrice: number;
  margin: number;
  marginPercentage: number;
}

export const ReportsInterface: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [selectedReport, setSelectedReport] = useState('sales');
  const [isLoading, setIsLoading] = useState(false);
  const [indexError, setIndexError] = useState(false);
  const [reportData, setReportData] = useState<any>({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactions: 0,
    salesByProduct: [],
    salesByCategory: [],
    salesByPaymentMethod: []
  });
  const [customDateRange, setCustomDateRange] = useState(false);

  const { user } = useAuthStore();

  // Charger les données du rapport
  useEffect(() => {
    const loadReportData = async () => {
      if (!user?.establishmentId) return;
      
      setIsLoading(true);
      setIndexError(false);
      
      try {
        // Calculer les dates de début et de fin
        let startDate: Date, endDate: Date;
        
        if (customDateRange) {
          startDate = new Date(dateRange.start);
          startDate.setHours(0, 0, 0, 0);
          
          endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
        } else {
          const now = new Date();
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          
          switch (selectedPeriod) {
            case 'today':
              startDate = new Date(now);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'yesterday':
              startDate = new Date(now);
              startDate.setDate(startDate.getDate() - 1);
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date(startDate);
              endDate.setHours(23, 59, 59, 999);
              break;
            case 'week':
              startDate = new Date(now);
              startDate.setDate(startDate.getDate() - 7);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'month':
              startDate = new Date(now);
              startDate.setMonth(startDate.getMonth() - 1);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'year':
              startDate = new Date(now);
              startDate.setFullYear(startDate.getFullYear() - 1);
              startDate.setHours(0, 0, 0, 0);
              break;
            default:
              startDate = new Date(now);
              startDate.setHours(0, 0, 0, 0);
          }
        }
        
        // Charger les ventes
        let salesData: any[] = [];
        let totalSales = 0;
        let transactions = 0;
        
        try {
          const salesQuery = query(
            collection(db, 'sales'),
            where('establishmentId', '==', user.establishmentId),
            where('status', '==', 'completed'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate))
          );
          
          const salesSnapshot = await getDocs(salesQuery);
          salesData = salesSnapshot.docs.map(doc => doc.data());
          totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
          transactions = salesData.length;
        } catch (error: any) {
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
            setIndexError(true);
            console.warn('Index composite requis pour les ventes. Chargement des données alternatives...');
            
            // Fallback: charger toutes les ventes de l'établissement et filtrer côté client
            const fallbackQuery = query(
              collection(db, 'sales'),
              where('establishmentId', '==', user.establishmentId)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const startTimestamp = Timestamp.fromDate(startDate);
            const endTimestamp = Timestamp.fromDate(endDate);
            
            salesData = fallbackSnapshot.docs
              .map(doc => doc.data())
              .filter(sale => 
                sale.status === 'completed' && 
                sale.createdAt && 
                sale.createdAt.toMillis() >= startTimestamp.toMillis() &&
                sale.createdAt.toMillis() <= endTimestamp.toMillis()
              );
            
            totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
            transactions = salesData.length;
          } else {
            throw error;
          }
        }
        
        // Charger les dépenses
        let expensesData: any[] = [];
        let totalExpenses = 0;
        
        try {
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('establishmentId', '==', user.establishmentId),
            where('status', '==', 'paid'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate))
          );
          
          const expensesSnapshot = await getDocs(expensesQuery);
          expensesData = expensesSnapshot.docs.map(doc => doc.data());
          totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
        } catch (error: any) {
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.warn('Index composite requis pour les dépenses. Chargement des données alternatives...');
            
            // Fallback: charger toutes les dépenses de l'établissement et filtrer côté client
            const fallbackQuery = query(
              collection(db, 'expenses'),
              where('establishmentId', '==', user.establishmentId)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            const startTimestamp = Timestamp.fromDate(startDate);
            const endTimestamp = Timestamp.fromDate(endDate);
            
            expensesData = fallbackSnapshot.docs
              .map(doc => doc.data())
              .filter(expense => 
                expense.status === 'paid' && 
                expense.createdAt && 
                expense.createdAt.toMillis() >= startTimestamp.toMillis() &&
                expense.createdAt.toMillis() <= endTimestamp.toMillis()
              );
            
            totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
          } else {
            throw error;
          }
        }
        
        // Calculer les ventes par produit
        const productSales: Record<string, SalesSummaryItem> = {};
        
        // Charger les produits pour obtenir les prix d'achat
        const productsQuery = query(
          collection(db, 'products'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = {
            name: data.name,
            purchasePrice: data.purchasePrice || 0,
            salePrice: data.salePrice || 0
          };
          return acc;
        }, {} as Record<string, { name: string, purchasePrice: number, salePrice: number }>);
        
        // Calculer les ventes par produit
        for (const sale of salesData) {
          if (sale.items && Array.isArray(sale.items)) {
            for (const item of sale.items) {
              const productId = item.productId;
              
              if (!productSales[productId]) {
                productSales[productId] = {
                  productId,
                  productName: item.productName,
                  quantity: 0,
                  totalSales: 0,
                  costPrice: 0,
                  margin: 0,
                  marginPercentage: 0
                };
              }
              
              productSales[productId].quantity += item.quantity;
              productSales[productId].totalSales += item.total;
              
              // Calculer le coût et la marge
              const product = productsData[productId];
              if (product) {
                const itemCost = product.purchasePrice * item.quantity;
                productSales[productId].costPrice += itemCost;
              }
            }
          }
        }
        
        // Calculer les marges après avoir traité tous les items
        Object.values(productSales).forEach(productSale => {
          productSale.margin = productSale.totalSales - productSale.costPrice;
          if (productSale.costPrice > 0) {
            productSale.marginPercentage = (productSale.margin / productSale.costPrice) * 100;
          }
        });
        
        // Convertir en tableau et trier par ventes totales
        const salesByProduct = Object.values(productSales).sort((a, b) => b.totalSales - a.totalSales);
        
        // Calculer le bénéfice total basé sur les marges des produits vendus
        const totalProductProfit = salesByProduct.reduce((sum, item) => sum + item.margin, 0);
        
        // Calculer les ventes par méthode de paiement
        const paymentMethods: Record<string, { method: string, amount: number, count: number }> = {};
        
        for (const sale of salesData) {
          const method = sale.paymentMethod || 'unknown';
          
          if (!paymentMethods[method]) {
            paymentMethods[method] = {
              method,
              amount: 0,
              count: 0
            };
          }
          
          paymentMethods[method].amount += sale.total;
          paymentMethods[method].count += 1;
        }
        
        const salesByPaymentMethod = Object.values(paymentMethods).sort((a, b) => b.amount - a.amount);
        
        // Calculer les ventes par catégorie
        const categorySales: Record<string, { category: string, amount: number, count: number }> = {};
        
        // Charger les catégories
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = doc.data().name;
          return acc;
        }, {} as Record<string, string>);
        
        // Calculer les ventes par catégorie
        for (const sale of salesData) {
          if (sale.items && Array.isArray(sale.items)) {
            for (const item of sale.items) {
              // Utiliser les données produit déjà chargées
              const product = productsData[item.productId];
              if (product && product.categoryId) {
                const categoryId = product.categoryId;
                const categoryName = categoriesData[categoryId] || 'Autre';
                
                if (!categorySales[categoryId]) {
                  categorySales[categoryId] = {
                    category: categoryName,
                    amount: 0,
                    count: 0
                  };
                }
                
                categorySales[categoryId].amount += item.total;
                categorySales[categoryId].count += item.quantity;
              }
            }
          }
        }
        
        const salesByCategory = Object.values(categorySales).sort((a, b) => b.amount - a.amount);
        
        // Mettre à jour les données du rapport
        setReportData({
          totalSales,
          totalExpenses,
          netProfit: totalProductProfit - totalExpenses, // Utiliser le bénéfice basé sur les marges produits
          transactions,
          salesByProduct,
          salesByCategory,
          salesByPaymentMethod,
          startDate,
          endDate
        });
        
      } catch (error) {
        console.error('Erreur lors du chargement des données du rapport:', error);
        toast.error('Erreur lors du chargement des données du rapport');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReportData();
  }, [user?.establishmentId, selectedPeriod, customDateRange, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getPeriodLabel = () => {
    if (customDateRange) {
      if (dateRange.start === dateRange.end) {
        return `le ${formatDate(new Date(dateRange.start))}`;
      }
      return `du ${formatDate(new Date(dateRange.start))} au ${formatDate(new Date(dateRange.end))}`;
    }
    
    switch (selectedPeriod) {
      case 'today': return "aujourd'hui";
      case 'yesterday': return "hier";
      case 'week': return "cette semaine";
      case 'month': return "ce mois";
      case 'year': return "cette année";
      default: return selectedPeriod;
    }
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleCustomDateToggle = () => {
    setCustomDateRange(!customDateRange);
    if (!customDateRange) {
      // Initialiser avec la date du jour
      const today = new Date().toISOString().split('T')[0];
      setDateRange({ start: today, end: today });
    }
  };

  const exportReport = (type: string) => {
    let csvContent = '';
    let filename = '';
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (type === 'sales') {
      filename = `rapport_ventes_${dateStr}.csv`;
      csvContent = "data:text/csv;charset=utf-8," + 
        "Produit,Quantité,Ventes Totales,Coût,Marge,Marge (%)\n" +
        reportData.salesByProduct.map((item: SalesSummaryItem) => 
          `"${item.productName}",${item.quantity},${item.totalSales},${item.costPrice},${item.margin},${item.marginPercentage.toFixed(2)}`
        ).join("\n");
    } else if (type === 'categories') {
      filename = `rapport_categories_${dateStr}.csv`;
      csvContent = "data:text/csv;charset=utf-8," + 
        "Catégorie,Montant,Nombre de ventes\n" +
        reportData.salesByCategory.map((item: any) => 
          `"${item.category}",${item.amount},${item.count}`
        ).join("\n");
    } else if (type === 'payment') {
      filename = `rapport_paiements_${dateStr}.csv`;
      csvContent = "data:text/csv;charset=utf-8," + 
        "Méthode de paiement,Montant,Nombre de transactions\n" +
        reportData.salesByPaymentMethod.map((item: any) => 
          `"${item.method}",${item.amount},${item.count}`
        ).join("\n");
    } else {
      filename = `rapport_complet_${dateStr}.csv`;
      csvContent = "data:text/csv;charset=utf-8," + 
        "Période,Ventes Totales,Dépenses Totales,Bénéfice Net,Transactions\n" +
        `"${getPeriodLabel()}",${reportData.totalSales},${reportData.totalExpenses},${reportData.netProfit},${reportData.transactions}`;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Rapport exporté avec succès');
  };

  const renderSalesReport = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Récapitulatif des ventes {getPeriodLabel()}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ventes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Coût</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Marge</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Marge (%)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.salesByProduct.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucune vente pour cette période
                  </td>
                </tr>
              ) : (
                reportData.salesByProduct.map((item: SalesSummaryItem, index: number) => (
                  <tr key={item.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.totalSales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={item.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.margin)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-medium ${
                        item.marginPercentage >= 30 ? 'text-green-600' : 
                        item.marginPercentage >= 15 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {item.marginPercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.salesByProduct.length > 0 && (
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-3 text-left text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {reportData.salesByProduct.reduce((sum: number, item: SalesSummaryItem) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(reportData.totalSales)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(reportData.salesByProduct.reduce((sum: number, item: SalesSummaryItem) => sum + item.costPrice, 0))}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(reportData.salesByProduct.reduce((sum: number, item: SalesSummaryItem) => sum + item.margin, 0))}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {(reportData.salesByProduct.reduce((sum: number, item: SalesSummaryItem) => sum + item.margin, 0) / 
                      reportData.salesByProduct.reduce((sum: number, item: SalesSummaryItem) => sum + item.costPrice, 0) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => exportReport('sales')}>
          <Download className="w-4 h-4 mr-2" />
          Exporter ce rapport
        </Button>
      </div>
    </div>
  );

  const renderCategoryReport = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventes par catégorie {getPeriodLabel()}</h3>
        
        {reportData.salesByCategory.length === 0 ? (
          <div className="text-center py-8">
            <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune vente par catégorie pour cette période</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pourcentage</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.salesByCategory.map((item: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {((item.amount / reportData.totalSales) * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Répartition graphique</h4>
              <div className="space-y-4">
                {reportData.salesByCategory.map((item: any, index: number) => {
                  const percentage = (item.amount / reportData.totalSales) * 100;
                  const colors = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'indigo', 'pink'];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{item.category}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          <span className="text-sm text-gray-600 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full bg-${color}-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => exportReport('categories')}>
          <Download className="w-4 h-4 mr-2" />
          Exporter ce rapport
        </Button>
      </div>
    </div>
  );

  const renderPaymentMethodReport = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des paiements {getPeriodLabel()}</h3>
        
        {reportData.salesByPaymentMethod.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun paiement pour cette période</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pourcentage</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.salesByPaymentMethod.map((item: any, index: number) => {
                    const methodLabel = 
                      item.method === 'cash' ? 'Espèces' :
                      item.method === 'card' ? 'Carte bancaire' :
                      item.method === 'mvola' ? 'MVola' :
                      item.method === 'orange_money' ? 'Orange Money' :
                      item.method === 'airtel_money' ? 'Airtel Money' : item.method;
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {methodLabel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {((item.amount / reportData.totalSales) * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {item.count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Répartition graphique</h4>
              <div className="space-y-4">
                {reportData.salesByPaymentMethod.map((item: any, index: number) => {
                  const percentage = (item.amount / reportData.totalSales) * 100;
                  const colors = ['blue', 'green', 'red', 'orange', 'purple'];
                  const color = colors[index % colors.length];
                  
                  const methodLabel = 
                    item.method === 'cash' ? 'Espèces' :
                    item.method === 'card' ? 'Carte bancaire' :
                    item.method === 'mvola' ? 'MVola' :
                    item.method === 'orange_money' ? 'Orange Money' :
                    item.method === 'airtel_money' ? 'Airtel Money' : item.method;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{methodLabel}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          <span className="text-sm text-gray-600 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full bg-${color}-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => exportReport('payment')}>
          <Download className="w-4 h-4 mr-2" />
          Exporter ce rapport
        </Button>
      </div>
    </div>
  );

  const renderFinancialSummary = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé financier {getPeriodLabel()}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
              <h4 className="text-lg font-medium text-green-800">Recettes totales</h4>
            </div>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(reportData.totalSales)}</p>
            <p className="text-sm text-green-600 mt-2">{reportData.transactions} transaction(s)</p>
          </div>
          
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <div className="flex items-center mb-2">
              <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
              <h4 className="text-lg font-medium text-red-800">Dépenses totales</h4>
            </div>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(reportData.totalExpenses)}</p>
          </div>
          
          <div className={`p-6 rounded-lg border ${
            reportData.netProfit >= 0 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center mb-2">
              <DollarSign className={`w-6 h-6 ${
                reportData.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
              } mr-2`} />
              <h4 className={`text-lg font-medium ${
                reportData.netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'
              }`}>
                {reportData.netProfit >= 0 ? 'Bénéfice net' : 'Perte nette'}
              </h4>
            </div>
            <p className={`text-3xl font-bold ${
              reportData.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              {formatCurrency(Math.abs(reportData.netProfit))}
            </p>
            {reportData.totalSales > 0 && (
              <p className={`text-sm ${
                reportData.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
              } mt-2`}>
                {((reportData.netProfit / reportData.totalSales) * 100).toFixed(1)}% des recettes
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-3">Répartition recettes/dépenses</h4>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  Recettes
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {formatCurrency(reportData.totalSales)}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div 
                style={{ width: "100%" }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
              ></div>
            </div>
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                  Dépenses
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-red-600">
                  {formatCurrency(reportData.totalExpenses)}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div 
                style={{ width: `${reportData.totalSales > 0 ? (reportData.totalExpenses / reportData.totalSales) * 100 : 0}%` }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
              ></div>
            </div>
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                  reportData.netProfit >= 0 ? 'text-blue-600 bg-blue-200' : 'text-orange-600 bg-orange-200'
                }`}>
                  {reportData.netProfit >= 0 ? 'Bénéfice' : 'Perte'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold inline-block ${
                  reportData.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {formatCurrency(Math.abs(reportData.netProfit))}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div 
                style={{ width: `${reportData.totalSales > 0 ? (Math.abs(reportData.netProfit) / reportData.totalSales) * 100 : 0}%` }} 
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  reportData.netProfit >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                }`}
              ></div>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => exportReport('complete')}>
          <Download className="w-4 h-4 mr-2" />
          Exporter ce rapport
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Analysez les performances de votre établissement
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant={customDateRange ? "primary" : "outline"} 
            onClick={handleCustomDateToggle}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {customDateRange ? "Masquer date personnalisée" : "Date personnalisée"}
          </Button>
          <Button onClick={() => exportReport('complete')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      {customDateRange ? (
        <Card>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button 
              variant="ghost" 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDateRange({ start: today, end: today });
              }}
            >
              Aujourd'hui
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap gap-2">
            {['today', 'yesterday', 'week', 'month', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === 'today' ? 'Aujourd\'hui' :
                 period === 'yesterday' ? 'Hier' :
                 period === 'week' ? 'Cette semaine' :
                 period === 'month' ? 'Ce mois' :
                 'Cette année'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Report Type Selection */}
      <Card>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedReport('financial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport === 'financial'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-1" />
            Résumé financier
          </button>
          <button
            onClick={() => setSelectedReport('sales')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-1" />
            Ventes par produit
          </button>
          <button
            onClick={() => setSelectedReport('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport === 'categories'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PieChart className="w-4 h-4 inline mr-1" />
            Ventes par catégorie
          </button>
          <button
            onClick={() => setSelectedReport('payment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport === 'payment'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-1" />
            Méthodes de paiement
          </button>
        </div>
      </Card>

      {/* Index Error Message */}
      {indexError && (
        <FirebaseIndexHelper 
          indexUrl="https://console.firebase.google.com/v1/r/project/saas-915ec/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9zYWFzLTkxNWVjL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zYWxlcy9pbmRleGVzL18QARoTCg9lc3RhYmxpc2htZW50SWQQARoKCgZzdGF0dXMQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC"
          title="Index de base de données requis pour les rapports"
          description="Pour des performances optimales, un index composite doit être créé dans Firebase. Les données sont actuellement chargées avec une méthode alternative qui peut être plus lente."
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des données...</h3>
            <p className="text-gray-500">Veuillez patienter pendant que nous générons votre rapport</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Report Content */}
          {selectedReport === 'financial' && renderFinancialSummary()}
          {selectedReport === 'sales' && renderSalesReport()}
          {selectedReport === 'categories' && renderCategoryReport()}
          {selectedReport === 'payment' && renderPaymentMethodReport()}
        </>
      )}
    </div>
  );
};