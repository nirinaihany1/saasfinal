export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'reader';
  establishmentId: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Nouveaux champs pour distinguer les types d'admin
  isSuperAdmin?: boolean;
  isSystemAdmin?: boolean;
  isClientAdmin?: boolean;
}

interface Establishment {
  id: string;
  name: string;
  address: string;
  nif?: string;
  stat?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency: 'MGA'; // Malagasy Ariary
  taxRate: number; // 20% for Madagascar
  authorizedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
  // Nouveau champ pour les établissements parents/enfants
  parentEstablishmentId?: string;
  isMainLocation?: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  establishmentId: string;
  isActive: boolean;
  isMainStore: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  reference: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  salePrice: number; // in Ariary
  purchasePrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  unit: string;
  image?: string;
  establishmentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Nouveau champ pour le stock par magasin
  storeStock?: Record<string, number>;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  establishmentId: string;
  createdAt: Date;
}

interface Sale {
  id: string;
  receiptNumber: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  establishmentId: string;
  storeId?: string; // Nouveau champ pour identifier le magasin
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mvola' | 'orange_money' | 'airtel_money';
  paymentAmount: number;
  changeAmount: number;
  status: 'completed' | 'cancelled' | 'refunded';
  createdAt: Date;
}

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  establishmentId: string;
  isActive: boolean;
  lastPurchase?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CashRegister {
  id: string;
  cashierId: string;
  establishmentId: string;
  storeId?: string; // Nouveau champ pour identifier le magasin
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  variance?: number;
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
  movements: CashMovement[];
}

interface CashMovement {
  id: string;
  type: 'sale' | 'refund' | 'adjustment' | 'withdrawal';
  amount: number;
  description: string;
  createdAt: Date;
}

// Nouvelles interfaces pour les dépenses
interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check';
  supplier?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: Date;
  establishmentId: string;
  storeId?: string; // Nouveau champ pour identifier le magasin
  userId: string;
  userName: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  establishmentId: string;
  createdAt: Date;
}

interface Budget {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  establishmentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Nouvelle interface pour les transferts de stock entre magasins
export interface StockTransfer {
  id: string;
  establishmentId: string;
  sourceStoreId: string;
  sourceStoreName: string;
  destinationStoreId: string;
  destinationStoreName: string;
  items: StockTransferItem[];
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdById: string;
  createdByName: string;
  completedById?: string;
  completedByName?: string;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

// Dummy export to ensure bundler preserves the module
const DUMMY_EXPORT = true;