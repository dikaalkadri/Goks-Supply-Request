// ============================================================
// DATABASE TYPES
// ============================================================

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'rejected';
export type PurchaseStatus = 'not_purchased' | 'purchased';

export interface Outlet {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  request_code: string;
  outlet_id: string;
  requester_name: string;
  note: string | null;
  status: RequestStatus;
  purchase_status: PurchaseStatus;
  edit_token: string;
  created_at: string;
  updated_at: string;
  // Joined
  outlet?: Outlet;
  request_items?: RequestItem[];
  request_photos?: RequestPhoto[];
  purchase_receipts?: PurchaseReceipt[];
}

export interface RequestItem {
  id: string;
  request_id: string;
  item_id: string | null;
  item_name: string;
  unit: string;
  qty: number;
  is_manual: boolean;
  created_at: string;
}

export interface RequestPhoto {
  id: string;
  request_id: string;
  storage_path: string;
  created_at: string;
}

export interface PurchaseReceipt {
  id: string;
  request_id: string;
  storage_path: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface ManualItemFormData {
  item_name: string;
  qty: number;
  unit: string;
  is_manual: true;
  item_id: null;
}

export interface MasterItemFormData {
  item_id: string;
  item_name: string;
  unit: string;
  qty: number;
  is_manual: false;
}

export type ItemFormData = ManualItemFormData | MasterItemFormData;

export interface RequestFormData {
  outlet_id: string;
  requester_name: string;
  note: string;
  items: ItemFormData[];
  photos: File[];
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface CreateRequestResponse {
  request_code: string;
  request_id: string;
  edit_token: string;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  total: number;
  today: number;
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  not_purchased: number;
  purchased: number;
  purchased_no_receipt: number;
}

// ============================================================
// FILTER TYPES
// ============================================================

export interface RequestFilters {
  search?: string;
  outlet_id?: string;
  status?: RequestStatus | '';
  purchase_status?: PurchaseStatus | '';
  has_receipt?: 'yes' | 'no' | '';
  has_photo?: 'yes' | 'no' | '';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// EXPORT TYPES
// ============================================================

export interface ExportRow {
  'Kode Request': string;
  Tanggal: string;
  Outlet: string;
  Pengaju: string;
  Barang: string;
  Qty: number;
  Satuan: string;
  Tipe: string;
  'Status Request': string;
  'Status Pembelian': string;
  'Ada Nota': string;
  Catatan: string;
}
