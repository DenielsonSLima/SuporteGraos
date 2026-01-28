
import { LucideIcon } from 'lucide-react';

export enum ModuleId {
  HOME = 'home',
  PARTNERS = 'partners',
  PURCHASE_ORDER = 'purchase_order',
  SALES_ORDER = 'sales_order',
  LOGISTICS = 'logistics',
  CASHIER = 'cashier',
  FINANCIAL = 'financial',
  ASSETS = 'assets',
  PERFORMANCE = 'performance',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  HELP = 'help', // NOVO
}

export interface MenuItem {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  description: string;
}

// Interfaces for future API integration
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  avatar?: string;
  token?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}