import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  X,
  ShoppingCart,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  Store,
  Building,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Store as StoreType } from '../../types';
import { StoreSelector } from '../ui/StoreSelector';
import { ReceiptGenerator } from './ReceiptGenerator';
import { formatAmountInWords } from '../../utils/numberToWords';
import { sendReceiptByEmail } from '../../services/emailService';

interface Product {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
  categoryId: string;
  category: string;
  taxRate: number;
  image?: string;
  unit: string;
  storeStock?: Record<string, number>;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const paymentMethods = [
  { id: 'cash', name: 'Espèces', icon: Banknote, color: 'green' },
  { id: 'card', name: 'Carte', icon: CreditCard, color: 'blue' },
  { id: 'mvola', name: 'Mvola', icon: Smartphone, color: 'red' },
  { id: 'orange_money', name: 'Orange Money', icon: Smartphone, color: 'orange' },
  { id: 'airtel_money', name: 'Airtel Money', icon: Smartphone, color: 'red' },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  productId: string;
  taxRate: number;
  unit: string;
  applyTax: boolean;
}

export const POSInterface: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);
  const [establishmentInfo, setEstablishmentInfo] = useState<any>(null);

  // États pour les données Firebase
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { user } = useAuthStore();

  // Charger les magasins
  const loadStores = async () => {
    if (!user?.establishmentId) return;

    try {
      const q = query(
        collection(db, 'stores'),
        where('establishmentId', '==', user.establishmentId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const storesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          address: data.address,
          phone: data.phone || '',
          email: data.email || '',
          establishmentId: data.establishmentId,
          isActive: data.isActive !== false,
          isMainStore: data.isMainStore || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as StoreType;
      });

      setStores(storesData);
      
      // Sélectionner le magasin principal par défaut
      const mainStore = storesData.find(store => store.isMainStore);
      if (mainStore) {
        setSelectedStore(mainStore.id);
      } else if (storesData.length > 0) {
        setSelectedStore(storesData[0].id);
      }
      
      // Si aucun magasin n'est sélectionné et qu'il y a plus d'un magasin, afficher le sélecteur
      if (storesData.length > 1) {
        setShowStoreSelector(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
    }
  };

  // Charger les catégories
  const loadCategories = async () => {
    if (!user?.establishmentId) return;

    try {
      const q = query(
        collection(db, 'categories'),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const snapshot = await getDocs(q);
      const categoriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          color: data.color
        } as Category;
      });

      setCategories(categoriesData);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  // Charger les produits
  const loadProducts = async () => {
    if (!user?.establishmentId) return;

    try {
      const q = query(
        collection(db, 'products'),
        where('establishmentId', '==', user.establishmentId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const category = categories.find(c => c.id === data.categoryId);
        
        return {
          id: doc.id,
          name: data.name,
          salePrice: data.salePrice,
          stock: data.stock,
          storeStock: data.storeStock || {},
          categoryId: data.categoryId,
          category: category?.name || 'Autre',
          taxRate: data.taxRate || 0, // Utiliser 0 comme valeur par défaut si non spécifié
          image: '📦', // Emoji par défaut
          unit: data.unit || 'pièce'
        } as Product;
      });

      setProducts(productsData);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast.error('Erreur lors du chargement des produits');
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      await loadStores();
      await loadCategories();
      await loadEstablishmentInfo();
      setLoadingData(false);
    };

    if (user?.establishmentId) {
      loadData();
    }
  }, [user?.establishmentId]);

  // Charger les informations de l'établissement
  const loadEstablishmentInfo = async () => {
    if (!user?.establishmentId) return;

    try {
      const estDoc = await getDoc(doc(db, 'establishments', user.establishmentId));
      if (estDoc.exists()) {
        const data = estDoc.data();
        setEstablishmentInfo({
          name: data.name || 'Nirina Nirina Pos Madagascar',
          address: data.address || 'Antananarivo, Madagascar',
          phone: data.phone || '+261 34 12 345 67',
          email: data.email || 'contact@saaspos.mg',
          nif: data.nif || '',
          stat: data.stat || ''
        });
      } else {
        // Valeurs par défaut si pas d'établissement trouvé
        setEstablishmentInfo({
          name: 'Nirina Nirina Pos Madagascar',
          address: 'Antananarivo, Madagascar',
          phone: '+261 34 12 345 67',
          email: 'contact@saaspos.mg',
          nif: '',
          stat: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des informations établissement:', error);
      // Valeurs par défaut en cas d'erreur
      setEstablishmentInfo({
        name: 'Nirina Nirina Pos Madagascar',
        address: 'Antananarivo, Madagascar',
        phone: '+261 34 12 345 67',
        email: 'contact@saaspos.mg',
        nif: '',
        stat: ''
      });
    }
  };
  // Recharger les produits quand les catégories changent
  useEffect(() => {
    if (categories.length > 0) {
      loadProducts();
    }
  }, [categories]);

  // Recharger les produits quand le magasin change pour synchroniser les stocks
  useEffect(() => {
    if (selectedStore && categories.length > 0) {
      loadProducts();
    }
  }, [selectedStore]);

  // Obtenir le stock d'un produit dans le magasin sélectionné
  const getProductStockInStore = (product: Product) => {
    if (!selectedStore) return product.stock;
    
    // Si le produit a un stock spécifique pour ce magasin, l'utiliser
    if (product.storeStock && product.storeStock[selectedStore] !== undefined) {
      return product.storeStock[selectedStore];
    }
    
    // Sinon, utiliser le stock global (pour le magasin principal)
    const mainStore = stores.find(s => s.isMainStore);
    if (mainStore && mainStore.id === selectedStore) {
      return product.stock;
    }
    
    return 0;
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const stockInStore = getProductStockInStore(product);
    const hasStock = stockInStore > 0;
    return matchesCategory && matchesSearch && hasStock;
  });

  const addToCart = (product: Product) => {
    const stockInStore = getProductStockInStore(product);
    if (stockInStore <= 0) {
      toast.error('Produit en rupture de stock dans ce magasin');
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= stockInStore) {
        toast.error('Stock insuffisant dans ce magasin');
        return;
      }
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        id: `cart_${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.salePrice,
        quantity: 1,
        image: product.image || '📦',
        taxRate: product.taxRate,
        unit: product.unit,
        applyTax: true
      }]);
    }
    toast.success(`${product.name} ajouté au panier`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        const stockInStore = getProductStockInStore(product);
        if (newQuantity > stockInStore) {
          toast.error('Stock insuffisant dans ce magasin');
          return;
        }
        
        setCart(cart.map(item => 
          item.productId === productId 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      }
    }
  };

  const toggleItemTax = (productId: string) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, applyTax: !item.applyTax }
        : item
    ));
  };

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => {
      // Si la TVA n'est pas appliquée ou si le taux de TVA est 0, le sous-total est simplement le prix * quantité
      // Sinon, on calcule le prix HT (prix / (1 + taxRate/100))
      const itemPrice = (item.applyTax && item.taxRate > 0)
        ? item.price / (1 + item.taxRate / 100) 
        : item.price;
      
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getCartTax = () => {
    return cart.reduce((total, item) => {
      // Si la TVA n'est pas appliquée ou si le taux de TVA est 0 ou négatif, pas de TVA à ajouter
      if (!item.applyTax || item.taxRate <= 0) return total;
      
      // Calculer le prix HT
      const itemPriceWithoutTax = item.price / (1 + item.taxRate / 100);
      // Calculer la TVA
      const itemTax = (item.price - itemPriceWithoutTax) * item.quantity;
      
      return total + itemTax;
    }, 0);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getChangeAmount = () => {
    if (paymentMethod === 'cash' && paymentAmount > 0) {
      return Math.max(0, paymentAmount - getCartTotal());
    }
    return 0;
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `REC-${year}${month}${day}-${timestamp}`;
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    if (paymentMethod === 'cash' && paymentAmount < getCartTotal()) {
      toast.error('Montant insuffisant');
      return;
    }

    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    if (!selectedStore) {
      toast.error('Veuillez sélectionner un magasin');
      return;
    }

    setIsProcessing(true);

    try {
      const receiptNumber = generateReceiptNumber();
      const saleData = {
        receiptNumber,
        cashierId: user.id,
        cashierName: user.name,
        customerId: null, // TODO: Gérer les clients
        customerName: 'Client anonyme',
        establishmentId: user.establishmentId,
        storeId: selectedStore, // Ajouter l'ID du magasin
        items: cart.map(item => ({
          id: `item_${Date.now()}_${Math.random()}`,
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          taxRate: item.taxRate,
          discount: 0,
          total: item.price * item.quantity
        })),
        subtotal: getCartSubtotal(),
        taxAmount: getCartTax(),
        discount: 0,
        total: getCartTotal(),
        paymentMethod,
        paymentAmount: paymentMethod === 'cash' ? paymentAmount : getCartTotal(),
        changeAmount: getChangeAmount(),
        status: 'completed',
        createdAt: Timestamp.now()
      };

      // Sauvegarder la vente
      const saleId = `sale_${Date.now()}`;
      await setDoc(doc(db, 'sales', saleId), saleData);

      // Mettre à jour les stocks
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          // Créer une copie du storeStock actuel ou un objet vide s'il n'existe pas
          const updatedStoreStock = { ...(product.storeStock || {}) };
          
          // Mettre à jour le stock du magasin sélectionné
          if (updatedStoreStock[selectedStore] !== undefined) {
            // Si le magasin a déjà un stock défini, le décrémenter
            updatedStoreStock[selectedStore] = Math.max(0, updatedStoreStock[selectedStore] - item.quantity);
          } else {
            // Si le magasin n'a pas de stock défini et que c'est le magasin principal, utiliser le stock global
            const isMainStore = stores.find(s => s.id === selectedStore)?.isMainStore;
            if (isMainStore) {
              updatedStoreStock[selectedStore] = Math.max(0, product.stock - item.quantity);
            } else {
              // Cas improbable: le magasin n'a pas de stock défini et ce n'est pas le magasin principal
              updatedStoreStock[selectedStore] = 0;
            }
          }
          
          // Mettre à jour le stock global si le magasin sélectionné est le magasin principal
          const isMainStore = stores.find(s => s.id === selectedStore)?.isMainStore;
          const newStock = isMainStore ? Math.max(0, product.stock - item.quantity) : product.stock;
          
          await updateDoc(doc(db, 'products', item.productId), {
            stock: newStock,
            storeStock: updatedStoreStock,
            updatedAt: Timestamp.now()
          });
        }
      }

      // Recharger les produits pour mettre à jour les stocks
      await loadProducts();

      // Préparer les données du reçu
      const receiptData = {
        receiptNumber,
        date: new Date(),
        cashierName: user.name,
        customerName: 'Client anonyme',
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity
        })),
        subtotal: getCartSubtotal(),
        taxAmount: getCartTax(),
        total: getCartTotal(),
        paymentMethod,
        paymentAmount: paymentMethod === 'cash' ? paymentAmount : getCartTotal(),
        changeAmount: getChangeAmount(),
        amountInWords: getAmountInWords(getCartTotal()),
        establishmentInfo: establishmentInfo || {
          name: 'Nirina Nirina Pos Madagascar',
          address: 'Antananarivo, Madagascar',
          phone: '+261 34 12 345 67',
          email: 'contact@saaspos.mg',
          nif: '',
          stat: ''
        }
      };

      setLastSaleReceipt(receiptData);

      // Réinitialiser le panier
      setCart([]);
      setShowPayment(false);
      setPaymentAmount(0);

      toast.success(`Vente ${receiptNumber} enregistrée avec succès !`, {
        duration: 5000,
        icon: '🎉'
      });

      // Proposer d'afficher le reçu
      setTimeout(() => {
        toast((t) => (
          <div className="flex items-center space-x-3">
            <span>Vente terminée ! Voulez-vous afficher le reçu ?</span>
            <button
              onClick={() => {
                setShowReceipt(true);
                toast.dismiss(t.id);
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Voir le reçu
            </button>
          </div>
        ), {
          duration: 6000
        });
      }, 1000);

    } catch (error) {
      console.error('Erreur lors du traitement de la vente:', error);
      toast.error('Erreur lors du traitement de la vente');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const handleStoreChange = (storeId: string) => {
    // Vider le panier lors du changement de magasin
    if (cart.length > 0) {
      if (window.confirm('Changer de magasin videra votre panier actuel. Continuer ?')) {
        setCart([]);
        setSelectedStore(storeId);
        setShowStoreSelector(false);
      }
    } else {
      setSelectedStore(storeId);
      setShowStoreSelector(false);
    }
  };

  const handlePrintReceipt = () => {
    if (lastSaleReceipt) {
      // Créer une fenêtre d'impression avec le contenu du reçu
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Reçu ${lastSaleReceipt.receiptNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0; padding: 10px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .company-info { font-size: 10px; line-height: 1.4; }
              .receipt-info { margin: 10px 0; font-size: 10px; }
              .items { margin: 10px 0; }
              .item { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
              .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; font-size: 10px; }
              .total-line { display: flex; justify-content: space-between; margin: 2px 0; }
              .grand-total { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
              .footer { text-align: center; margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; font-size: 10px; }
              @media print { body { margin: 0; padding: 5px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">${lastSaleReceipt.establishmentInfo.name}</div>
              <div class="company-info">
                ${lastSaleReceipt.establishmentInfo.address}<br>
                Tél: ${lastSaleReceipt.establishmentInfo.phone}<br>
                Email: ${lastSaleReceipt.establishmentInfo.email}
              </div>
            </div>
            
            <div class="receipt-info">
              <div><strong>Reçu N°:</strong> ${lastSaleReceipt.receiptNumber}</div>
              <div><strong>Date:</strong> ${lastSaleReceipt.date.toLocaleDateString('fr-FR')} ${lastSaleReceipt.date.toLocaleTimeString('fr-FR')}</div>
              <div><strong>Caissier:</strong> ${lastSaleReceipt.cashierName}</div>
            </div>
            
            <div class="items">
              ${lastSaleReceipt.items.map((item: any) => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>${formatCurrency(item.total)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-line">
                <span>Sous-total:</span>
                <span>${formatCurrency(lastSaleReceipt.subtotal)}</span>
              </div>
              <div class="total-line">
                <span>TVA:</span>
                <span>${formatCurrency(lastSaleReceipt.taxAmount)}</span>
              </div>
              <div class="total-line grand-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(lastSaleReceipt.total)}</span>
              </div>
              <div class="total-line">
                <span>Payé:</span>
                <span>${formatCurrency(lastSaleReceipt.paymentAmount)}</span>
              </div>
              ${lastSaleReceipt.changeAmount > 0 ? `
                <div class="total-line">
                  <span>Rendu:</span>
                  <span>${formatCurrency(lastSaleReceipt.changeAmount)}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="amount-in-words" style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-style: italic; font-size: 10px;">
              ${formatAmountInWords(lastSaleReceipt.total)}
            </div>
            
            <div class="footer">
              Merci de votre visite !
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleEmailReceipt = (email: string) => {
    // Cette fonction est maintenant gérée directement dans ReceiptGenerator
    // avec EmailJS, donc on affiche juste une confirmation
    toast.success(`Reçu envoyé à ${email}`, {
      duration: 4000,
      icon: '📧'
    });
  };

  if (loadingData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du point de vente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Store Selector */}
      <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <Store className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-blue-800">Magasin actuel:</p>
            <p className="font-semibold text-blue-900">
              {selectedStore 
                ? stores.find(s => s.id === selectedStore)?.name || 'Magasin inconnu'
                : 'Aucun magasin sélectionné'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowStoreSelector(true)}
          className="text-blue-600 hover:bg-blue-100"
        >
          Changer de magasin
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6">
        {/* Products Section */}
        <div className="flex-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Point de Vente</h1>
              <div className="w-80">
                <Input
                  placeholder="Rechercher produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-5 h-5 text-gray-400" />}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({products.filter(p => getProductStockInStore(p) > 0).length})
              </button>
              {categories.map((category) => {
                const categoryProducts = products.filter(p => 
                  p.categoryId === category.id && getProductStockInStore(p) > 0
                );
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name} ({categoryProducts.length})
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit disponible</h3>
                <p className="text-gray-500">
                  {products.length === 0 
                    ? 'Ajoutez des produits dans la section "Produits"'
                    : 'Aucun produit ne correspond à votre recherche ou n\'est disponible dans ce magasin'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => {
                  const stockInStore = getProductStockInStore(product);
                  
                  return (
                    <Card key={product.id} padding="sm" className="cursor-pointer hover:shadow-md transition-shadow">
                      <div onClick={() => addToCart(product)}>
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          <span className="text-4xl">{product.image}</span>
                        </div>
                        <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600">{formatCurrency(product.salePrice)}</span>
                          <span className={`text-xs ${stockInStore <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                            Stock: {stockInStore}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96">
          <Card padding="none" className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Panier ({cart.length})
                </h2>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                    Vider
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Panier vide</p>
                  <p className="text-sm">Ajoutez des produits pour commencer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl">{item.image}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-500">{formatCurrency(item.price)} / {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                        {item.taxRate > 0 && (
                          <button
                            onClick={() => toggleItemTax(item.productId)}
                            className={`text-xs px-2 py-1 rounded-full mt-1 transition-colors ${
                              item.applyTax 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={item.applyTax ? 'Cliquer pour désactiver la TVA' : 'Cliquer pour activer la TVA'}
                          >
                            TVA {item.taxRate}% {item.applyTax ? '✓' : '✗'}
                          </button>
                        )}
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-500 hover:text-red-700 mt-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{formatCurrency(getCartSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span>{formatCurrency(getCartTax())}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-blue-600">{formatCurrency(getCartTotal())}</span>
                  </div>
                </div>

                {!showPayment ? (
                  <Button fullWidth size="lg" onClick={() => setShowPayment(true)}>
                    Procéder au paiement
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center ${
                            paymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <method.icon className="w-4 h-4 mr-2" />
                          <span className="text-sm">{method.name}</span>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'cash' && (
                      <div>
                        <Input
                          label="Montant reçu (Ar)"
                          type="number"
                          value={paymentAmount || ''}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          placeholder="0"
                        />
                        {paymentAmount > 0 && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <div className="flex justify-between">
                              <span>Rendu:</span>
                              <span className="font-bold">{formatCurrency(getChangeAmount())}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="ghost" fullWidth onClick={() => setShowPayment(false)}>
                        Retour
                      </Button>
                      <Button 
                        variant="success" 
                        fullWidth 
                        onClick={processPayment}
                        disabled={
                          isProcessing || 
                          (paymentMethod === 'cash' && paymentAmount < getCartTotal()) ||
                          !selectedStore
                        }
                      >
                        {isProcessing ? 'Traitement...' : 'Finaliser'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Store Selector Modal */}
      {showStoreSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <StoreSelector 
              onStoreSelect={handleStoreChange}
              selectedStore={selectedStore}
              onClose={() => setShowStoreSelector(false)}
            />
          </Card>
        </div>
      )}

      {/* Générateur de reçu */}
      {showReceipt && lastSaleReceipt && (
        <ReceiptGenerator
          receiptData={lastSaleReceipt}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrintReceipt}
          onEmailSend={handleEmailReceipt}
        />
      )}
    </div>
  );
};