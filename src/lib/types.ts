export type BookingSource = 'manual' | 'uplisting_api' | 'uplisting_webhook';

export interface Booking {
  id: string;
  reference: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  uplisting_booking_id?: string;
  uplisting_listing_id?: string;
  source?: BookingSource;
  raw_payload?: Record<string, unknown>;
}

export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Apartment {
  id: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  uplisting_id?: string;
  uplisting_name?: string;
  // Amount paid to cleaner for a cleaning at this apartment (not customer price)
  cleaner_payout?: number;
  created_at: string;
  updated_at: string;
}

export interface UplistingListing {
  id: string;
  name: string;
  internal_name: string;
}

export interface UplistingBooking {
  id: string;
  listing_id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  status: string;
  accommodation_total: number | null;
  cleaning_fee: number | null;
  channel_commission: number | null;
  taxes: number | null;
  total_payout: number | null;
  channel: string | null;
  booking_reference: string | null;
  created_at: string | null;
}

export interface SyncResult {
  synced: number;
  skipped?: number;
  errors: string[];
}

export interface RSALaundryAsset {
  id: string;
  asset_name: string;
  asset_type: 'LAUNDRY_SERVICE' | 'MAINTENANCE_SERVICE' | 'OTHER_SERVICE';
  owner_name: string;
  owner_email?: string;
  location?: string;
  daily_payment_rate: number;
  service_description?: string;
  cleaner_payout: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cleaner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface CleaningSession {
  id: string;
  apartment_id: string;
  cleaner_id: string;
  cleaning_date: string;
  notes?: string;
  price?: number;
  created_at: string;
  updated_at: string;
  apartment?: Apartment;
  cleaner?: Cleaner;
}

// Detailed view that includes apartment and cleaner information
export interface CleaningSessionDetailed {
  id: string;
  apartment_id: string;
  cleaner_id: string;
  cleaner_2_id?: string | null;
  cleaning_date: string;
  notes?: string;
  price?: number;
  // Optional: present when welcome pack fee is applied
  welcome_pack_fee?: number | null;
  // Multi-cleaner fields
  cleaner_1_name?: string;
  cleaner_2_name?: string;
  cleaner_1_fee?: number;
  cleaner_2_fee?: number | null;
  total_cleaning_fee?: number;
  is_multi_cleaner?: boolean;
  cleaner_count?: number;
  // Property type fields
  property_category?: 'apartment' | 'internal_asset' | 'rsa_asset';
  property_id?: string;
  created_at: string;
  updated_at: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_name: string;
  cleaner_phone?: string;
  cleaner_email?: string;
  // Additional cleaner details
  cleaner_2_name_view?: string;
  cleaner_2_email?: string;
  cleaner_2_phone?: string;
}

// Union type for all schedulable properties (apartments and RSA assets)
export interface SchedulableProperty {
  property_category: 'apartment' | 'internal_asset' | 'rsa_asset';
  id: string;
  property_name: string;
  owner_name: string;
  owner_email?: string;
  location?: string;
  cleaner_payout?: number;
  asset_type?: string;
  service_description?: string;
  daily_payment_rate?: number;
}

export interface DashboardStats {
  total_apartments: number;
  total_cleaners: number;
  total_sessions: number;
  sessions_this_month: number;
  upcoming_sessions: number;
}

// Form types for creating/updating records
export interface CreateApartmentData {
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_payout?: number;
}

export interface CreateRSALaundryAssetData {
  asset_name: string;
  asset_type: 'LAUNDRY_SERVICE' | 'MAINTENANCE_SERVICE' | 'OTHER_SERVICE';
  owner_name?: string;
  owner_email?: string;
  location?: string;
  daily_payment_rate: number;
  service_description?: string;
  cleaner_payout: number;
  is_active?: boolean;
}

export interface UpdateApartmentData extends Partial<CreateApartmentData> {
  id: string;
}

export interface UpdateRSALaundryAssetData extends Partial<CreateRSALaundryAssetData> {
  id: string;
}

export interface CreateCleanerData {
  name: string;
  phone?: string;
  email?: string;
}

export interface UpdateCleanerData extends Partial<CreateCleanerData> {
  id: string;
}

export interface CreateCleaningSessionData {
  apartment_id: string; // Keep for backward compatibility, maps to property_id
  property_category?: 'apartment' | 'rsa_asset' | 'internal_asset'; // Optional for backward compatibility
  cleaner_id: string;
  cleaner_2_id?: string | null; // Second cleaner for multi-cleaner sessions
  cleaning_date: string;
  notes?: string;
  price?: number; // Total price for the session (should not be duplicated)
  // Individual cleaner fees (for multi-cleaner sessions)
  cleaner_1_fee?: number;
  cleaner_2_fee?: number | null;
  // Multi-cleaner session flag
  is_multi_cleaner?: boolean;
  include_welcome_pack?: boolean;
}

export interface UpdateCleaningSessionData extends Partial<CreateCleaningSessionData> {
  id: string;
  // Additional fields for updating multi-cleaner sessions
  cleaner_1_name?: string;
  cleaner_2_name?: string | null;
  total_cleaning_fee?: number;
  cleaner_count?: number;
}

// RSA Laundry Room Expense types
export interface RSALaundryExpense {
  id: string;
  asset_id: string;
  cleaner_id: string;
  service_date: string;
  daily_payment_amount: number;
  service_description?: string;
  notes?: string;
  is_paid: boolean;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

// Detailed view that includes asset and cleaner information
export interface RSALaundryExpenseDetailed extends RSALaundryExpense {
  asset_name: string;
  asset_type: string;
  asset_owner: string;
  asset_location?: string;
  cleaner_name: string;
  cleaner_phone?: string;
  cleaner_email?: string;
}

// Form types for creating/updating RSA laundry expenses
export interface CreateRSALaundryExpenseData {
  cleaner_id: string;
  service_date: string;
  daily_payment_amount: number;
  service_description?: string;
  notes?: string;
}

export interface UpdateRSALaundryExpenseData extends Partial<CreateRSALaundryExpenseData> {
  id: string;
  is_paid?: boolean;
  payment_date?: string;
}

// Welcome Pack Item types
export interface WelcomePackItem {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWelcomePackItemData {
  name: string;
  price: number;
  is_active?: boolean;
}

export type UpdateWelcomePackItemData = Partial<CreateWelcomePackItemData>;

// Inventory Item types
export interface InventoryItem {
  id: string;
  name: string;
  item_type: 'detergent' | 'welcome_pack';
  current_stock: number;
  unit_of_measure: string;
  min_stock_level?: number;
  purchase_price?: number;
  purchase_quantity?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemData {
  name: string;
  item_type: 'detergent' | 'welcome_pack';
  current_stock: number;
  unit_of_measure: string;
  min_stock_level?: number;
  purchase_price?: number;
  purchase_quantity?: number;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateInventoryItemData extends Partial<CreateInventoryItemData> {
  id: string;
}

// Stock Take types
export interface StockTake {
  id: string;
  item_id: string;
  previous_stock: number;
  new_stock: number;
  adjustment_amount: number;
  take_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateStockTakeData {
  item_id: string;
  new_stock: number;
  notes?: string;
}

export interface StockTakeWithItem extends StockTake {
  inventory_items: {
    name: string;
    item_type: string;
    unit_of_measure: string;
  };
}

export interface UsageAnalytics {
  item: InventoryItem;
  totalUsage: number;
  remainingStock: number;
  usageRate: number;
  daysRemaining: number;
}

// Welcome Pack Configuration types
export interface WelcomePackConfiguration {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWelcomePackConfigurationData {
  name: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateWelcomePackConfigurationData extends Partial<CreateWelcomePackConfigurationData> {
  id: string;
}

// Welcome Pack Configuration Item types
export interface WelcomePackConfigurationItem {
  id: string;
  configuration_id: string;
  inventory_item_id: string;
  quantity: number;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  inventory_item?: InventoryItem;
}

export interface CreateWelcomePackConfigurationItemData {
  configuration_id: string;
  inventory_item_id: string;
  quantity: number;
  is_optional?: boolean;
}

export interface UpdateWelcomePackConfigurationItemData extends Partial<CreateWelcomePackConfigurationItemData> {
  id: string;
}

// Welcome Pack Distribution types
export interface WelcomePackDistribution {
  id: string;
  booking_id?: string;
  apartment_id?: string;
  configuration_id: string;
  guest_name?: string;
  guest_contact?: string;
  distribution_date: string;
  prepared_by_staff?: string;
  total_cost?: number;
  notes?: string;
  status: 'prepared' | 'delivered' | 'declined' | 'partial';
  created_at: string;
  updated_at: string;
  // Joined data
  configuration?: WelcomePackConfiguration;
  apartment?: Apartment;
  booking?: { id: string; reference: string; guest_name: string; check_in: string; check_out: string }; // Booking type
  items?: WelcomePackDistributionItem[];
}

export interface CreateWelcomePackDistributionData {
  booking_id?: string;
  apartment_id?: string;
  configuration_id: string;
  guest_name?: string;
  guest_contact?: string;
  distribution_date?: string;
  prepared_by_staff?: string;
  notes?: string;
  status?: 'prepared' | 'delivered' | 'declined' | 'partial';
}

export interface UpdateWelcomePackDistributionData extends Partial<CreateWelcomePackDistributionData> {
  id: string;
}

// Welcome Pack Distribution Item types
export interface WelcomePackDistributionItem {
  id: string;
  distribution_id: string;
  inventory_item_id: string;
  quantity_issued: number;
  quantity_declined: number;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
  created_at: string;
  // Joined data
  inventory_item?: InventoryItem;
}

export interface CreateWelcomePackDistributionItemData {
  distribution_id: string;
  inventory_item_id: string;
  quantity_issued: number;
  quantity_declined?: number;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
}

export interface UpdateWelcomePackDistributionItemData extends Partial<CreateWelcomePackDistributionItemData> {
  id: string;
}

// Welcome Pack Alert types
export interface WelcomePackAlert {
  id: string;
  inventory_item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'expiring_soon';
  threshold_value?: number;
  current_stock?: number;
  message: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  // Joined data
  inventory_item?: InventoryItem;
}

export interface CreateWelcomePackAlertData {
  inventory_item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'expiring_soon';
  threshold_value?: number;
  current_stock?: number;
  message: string;
}

export interface UpdateWelcomePackAlertData extends Partial<CreateWelcomePackAlertData> {
  id: string;
  is_resolved?: boolean;
  resolved_by?: string;
}

// Welcome Pack Report types
export interface WelcomePackConsumptionReport {
  period: string;
  total_distributions: number;
  total_cost: number;
  items_consumed: Array<{
    item_name: string;
    quantity_issued: number;
    total_cost: number;
  }>;
  daily_breakdown?: Array<{
    date: string;
    distributions: number;
    cost: number;
  }>;
}

export interface WelcomePackCostAnalysis {
  configuration_id: string;
  configuration_name: string;
  total_cost: number;
  item_breakdown: Array<{
    item_name: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }>;
}

// Invoice types
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id?: string;
  guest_id: string;
  apartment_id: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoice_title?: string;
  client_name: string;
  client_prefix?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  subject_description?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  amount_paid?: number;
  balance_due: number;
  line_items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  bank_account_id?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  paid_at?: string;
  // Related data
  booking?: Booking;
  guest?: Guest;
  apartment?: Apartment;
  bank_account?: BankAccountDetail;
}

export interface CreateInvoiceData {
  booking_id?: string;
  guest_id: string;
  apartment_id: string;
  invoice_date: string;
  due_date: string;
  invoice_title?: string;
  client_name: string;
  client_prefix?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  line_items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  bank_account_id?: string;
}

export interface UpdateInvoiceData {
  id: string;
  invoice_date?: string;
  due_date?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoice_title?: string;
  client_name?: string;
  client_prefix?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  subject_description?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  amount_paid?: number;
  line_items?: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  bank_account_id?: string;
}

export interface BankAccountDetail {
  id: string;
  account_name: string;
  beneficiary_name: string;
  account_number: string;
  branch_code: string;
  bank_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountDetailData {
  account_name: string;
  beneficiary_name: string;
  account_number: string;
  branch_code: string;
  bank_name: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateBankAccountDetailData {
  account_name?: string;
  beneficiary_name?: string;
  account_number?: string;
  branch_code?: string;
  bank_name?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export type CleaningTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type CleaningTaskType = 'checkout_clean' | 'midstay_clean';

export interface CleaningTask {
  id: string;
  booking_id: string | null;
  apartment_id: string;
  task_type: CleaningTaskType;
  scheduled_date: string;
  status: CleaningTaskStatus;
  notes?: string | null;
  assigned_cleaner_id?: string | null;
  cleaner_payout?: number | null;
  auto_assigned?: boolean;
  is_manual?: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  apartment_name?: string;
  cleaner_name?: string;
  guest_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  booking_reference?: string;
}

export interface CleanerAssignment {
  id: string;
  apartment_id: string;
  cleaner_id: string;
  is_primary: boolean;
  created_at?: string;
  apartment_name?: string;
  cleaner_name?: string;
}

export interface CleanerPayoutRate {
  id: string;
  cleaner_id: string;
  apartment_id: string;
  checkout_clean_rate: number;
  midstay_clean_rate: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
  cleaner_name?: string;
  apartment_name?: string;
}

export interface CleanerPayoutSummary {
  cleaner_id: string;
  cleaner_name: string;
  checkout_count: number;
  midstay_count: number;
  total_payout: number;
  tasks: CleaningTask[];
}
