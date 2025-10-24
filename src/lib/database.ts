import { supabase, TABLES, VIEWS, SETTINGS } from './supabase';
import { createServerComponentClient, createServiceRoleClient } from './supabase-server';
import {
  Apartment,
  Cleaner,
  CleaningSession,
  CleaningSessionDetailed,
  CreateApartmentData,
  UpdateApartmentData,
  CreateCleanerData,
  WelcomePackItem,
  CreateWelcomePackItemData,
  UpdateWelcomePackItemData,
  UpdateCleanerData,
  CreateCleaningSessionData,
  UpdateCleaningSessionData,
  DashboardStats,
  InventoryItem,
  CreateInventoryItemData,
  UpdateInventoryItemData,
  StockTake,
  StockTakeWithItem,
  WelcomePackConfiguration,
  CreateWelcomePackConfigurationData,
  UpdateWelcomePackConfigurationData,
  WelcomePackConfigurationItem,
  CreateWelcomePackConfigurationItemData,
  UpdateWelcomePackConfigurationItemData,
  WelcomePackDistribution,
  CreateWelcomePackDistributionData,
  UpdateWelcomePackDistributionData,
  WelcomePackDistributionItem,
  CreateWelcomePackDistributionItemData,
  UpdateWelcomePackDistributionItemData,
  WelcomePackAlert,
  CreateWelcomePackAlertData,
  UpdateWelcomePackAlertData,
  WelcomePackConsumptionReport,
  WelcomePackCostAnalysis,
} from './types';

// Helper function to get authenticated Supabase client
const getSupabaseClient = async () => {
  try {
    return await createServerComponentClient();
  } catch (error) {
    console.warn('Failed to create server client, falling back to client:', error);
    return supabase;
  }
};

// Helper function to get service role client for admin operations
const getServiceRoleClient = () => {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.warn('Failed to create service role client, falling back to regular client:', error);
    return supabase;
  }
};

// Apartments CRUD operations
export const apartmentsApi = {
  // Get all apartments
  async getAll(): Promise<Apartment[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .select('*')
      .order('apartment_number');
    
    if (error) throw error;
    return data || [];
  },

  // Get apartment by ID
  async getById(id: string): Promise<Apartment | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      // If no apartment found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Create new apartment
  async create(apartment: CreateApartmentData): Promise<Apartment> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .insert(apartment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update apartment
  async update(apartment: UpdateApartmentData): Promise<Apartment> {
    const { id, ...updateData } = apartment;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete apartment
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.APARTMENTS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Cleaners CRUD operations
export const cleanersApi = {
  // Get all cleaners
  async getAll(): Promise<Cleaner[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get cleaner by ID
  async getById(id: string): Promise<Cleaner | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      // If no cleaner found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Create new cleaner
  async create(cleaner: CreateCleanerData): Promise<Cleaner> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .insert(cleaner)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update cleaner
  async update(cleaner: UpdateCleanerData): Promise<Cleaner> {
    const { id, ...updateData } = cleaner;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete cleaner
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.CLEANERS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Cleaning Sessions CRUD operations
export const cleaningSessionsApi = {
  // Get all cleaning sessions with apartment and cleaner details
  async getAll(): Promise<CleaningSessionDetailed[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .order('cleaning_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get all cleaning sessions (basic type for conflict checking)
  async getAllBasic(): Promise<CleaningSession[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*')
      .order('cleaning_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get cleaning session by ID
  async getById(id: string): Promise<CleaningSessionDetailed | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      // If no session found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get cleaning sessions by date range
  async getByDateRange(startDate: string, endDate: string): Promise<CleaningSessionDetailed[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .gte('cleaning_date', startDate)
      .lte('cleaning_date', endDate)
      .order('cleaning_date');
    
    if (error) throw error;
    return data || [];
  },

  // Get upcoming cleaning sessions
  async getUpcoming(): Promise<CleaningSessionDetailed[]> {
    const today = new Date().toISOString().split('T')[0];
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .gte('cleaning_date', today)
      .order('cleaning_date');
    
    if (error) throw error;
    return data || [];
  },

  // Create new cleaning session
  async create(session: CreateCleaningSessionData & { 
    property_category?: 'apartment' | 'internal_asset' | 'rsa_asset';
    property_id?: string;
    welcome_pack_fee?: number | null;
    cleaner_1_name?: string;
    cleaner_2_name?: string | null;
    is_multi_cleaner?: boolean;
    cleaner_count?: number;
  }): Promise<CleaningSession> {
    const client = await getSupabaseClient();
    
    // Map the session data to the new structure with multi-cleaner support
    const sessionData = {
      apartment_id: session.apartment_id, // Keep for backward compatibility
      property_category: session.property_category || 'apartment',
      property_id: session.property_id || session.apartment_id,
      cleaner_id: session.cleaner_id,
      cleaner_2_id: session.cleaner_2_id,
      cleaning_date: session.cleaning_date,
      notes: session.notes,
      price: session.price,
      welcome_pack_fee: session.welcome_pack_fee,
      // Multi-cleaner fields
      cleaner_1_name: session.cleaner_1_name,
      cleaner_2_name: session.cleaner_2_name,
      cleaner_1_fee: session.cleaner_1_fee,
      cleaner_2_fee: session.cleaner_2_fee,
      is_multi_cleaner: session.is_multi_cleaner || false,
      cleaner_count: session.cleaner_count || 1
    };
    
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update cleaning session
  async update(session: UpdateCleaningSessionData): Promise<CleaningSession> {
    const { id, ...updateData } = session;
    // Use logger for optional audit
    // import locally to avoid cyclic deps at module top
    const { logger } = await import('./logger');
    logger.audit(`Updating cleaning session ${id} with data:`, JSON.stringify(updateData, null, 2));
    
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error(`[AUDIT] Database update error for session ${id}:`, error);
      throw error;
    }
    
    logger.audit(`Successfully updated cleaning session ${id}`);
    return data;
  },

  // Delete cleaning session
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Items operations
export const welcomePackApi = {
  async getAll(): Promise<WelcomePackItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ITEMS)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<WelcomePackItem> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ITEMS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(data: CreateWelcomePackItemData): Promise<WelcomePackItem> {
    const client = await getSupabaseClient();
    const { data: newItem, error } = await client
      .from(TABLES.WELCOME_PACK_ITEMS)
      .insert({
        ...data,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return newItem;
  },

  async update(id: string, data: UpdateWelcomePackItemData): Promise<WelcomePackItem> {
    const client = await getSupabaseClient();
    const { data: updatedItem, error } = await client
      .from(TABLES.WELCOME_PACK_ITEMS)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updatedItem;
  },

  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_ITEMS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// App settings operations (keeping for backward compatibility)
export const settingsApi = {
  async getWelcomePackFee(): Promise<number> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(SETTINGS.APP_SETTINGS)
      .select('value')
      .eq('key', 'welcome_pack_fee')
      .single();
    if (error) throw error;
    return Number(data?.value ?? 0);
  },

  async setWelcomePackFee(fee: number): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(SETTINGS.APP_SETTINGS)
      .upsert({ key: 'welcome_pack_fee', value: fee, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },
};

// Inventory Items CRUD operations
export const inventoryItemsApi = {
  // Get all inventory items
  async getAll(): Promise<InventoryItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .select('*')
      .eq('is_active', true)
      .order('item_type', { ascending: true })
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get inventory items by type
  async getByType(type: 'detergent' | 'welcome_pack'): Promise<InventoryItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .select('*')
      .eq('item_type', type)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get inventory item by ID
  async getById(id: string): Promise<InventoryItem | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Create new inventory item
  async create(item: CreateInventoryItemData): Promise<InventoryItem> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .insert({
        ...item,
        is_active: item.is_active ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update inventory item
  async update(item: UpdateInventoryItemData): Promise<InventoryItem> {
    const { id, ...updateData } = item;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete inventory item (soft delete by setting is_active to false)
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Get low stock items
  async getLowStock(): Promise<InventoryItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .select('*')
      .eq('is_active', true)
      .not('min_stock_level', 'is', null)
      .filter('current_stock', 'lte', 'min_stock_level')
      .order('item_type')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Add stock to existing inventory item
  async addStock(id: string, stockData: { quantity: number; price: number }, createdBy?: string): Promise<InventoryItem> {
    const client = await getSupabaseClient();
    
    // First get the current item to calculate new values
    const { data: currentItem, error: fetchError } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!currentItem) {
      throw new Error('Inventory item not found');
    }
    
    // Calculate new stock level and accumulate purchase tracking
    const newStockLevel = currentItem.current_stock + stockData.quantity;
    
    // Accumulate purchase price and quantity (add to existing values)
    const accumulatedPurchasePrice = (currentItem.purchase_price || 0) + stockData.price;
    const accumulatedPurchaseQuantity = (currentItem.purchase_quantity || 0) + stockData.quantity;
    
    // Update the item with new stock level and accumulated purchase information
    const { data, error } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .update({
        current_stock: newStockLevel,
        purchase_price: accumulatedPurchasePrice,
        purchase_quantity: accumulatedPurchaseQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Create a stock take record for the addition
    try {
      await client
        .from('stock_takes')
        .insert({
          item_id: id,
          previous_stock: currentItem.current_stock,
          new_stock: newStockLevel,
          adjustment_amount: stockData.quantity, // positive for additions
          take_date: new Date().toISOString(),
          notes: `Stock addition: +${stockData.quantity} units for R${stockData.price.toFixed(2)}`,
          created_by: createdBy || 'system'
        });
    } catch (stockTakeError) {
      // Log error but don't fail the main operation
      console.warn('Failed to create stock take record for addition:', stockTakeError);
    }
    
    return data;
  },

  // Perform stock take - update stock and record the adjustment
  async performStockTake(
    id: string, 
    newStock: number, 
    notes?: string,
    createdBy?: string
  ): Promise<{ item: InventoryItem; stockTake: StockTake }> {
    const client = await getSupabaseClient();
    
    // Get current item
    const currentItem = await this.getById(id);
    if (!currentItem) {
      throw new Error('Inventory item not found');
    }
    
    const previousStock = currentItem.current_stock;
    const adjustmentAmount = newStock - previousStock;
    
    // Update item stock
    const { data: updatedItem, error: updateError } = await client
      .from(TABLES.INVENTORY_ITEMS)
      .update({ 
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Try to record stock take, but don't fail if table doesn't exist
    let stockTake: StockTake;
    try {
      const { data: stockTakeData, error: stockTakeError } = await client
        .from('stock_takes')
        .insert({
          item_id: id,
          previous_stock: previousStock,
          new_stock: newStock,
          adjustment_amount: adjustmentAmount,
          notes,
          created_by: createdBy || 'system'
        })
        .select()
        .single();
      
      if (stockTakeError) {
        console.warn('Could not record stock take (table may not exist):', stockTakeError);
        // Create a mock stock take object for consistency
        stockTake = {
          id: 'temp-' + Date.now(),
          item_id: id,
          previous_stock: previousStock,
          new_stock: newStock,
          adjustment_amount: adjustmentAmount,
          take_date: new Date().toISOString(),
          notes,
          created_by: createdBy || 'system',
          created_at: new Date().toISOString()
        };
      } else {
        stockTake = stockTakeData;
      }
    } catch (error) {
      console.warn('Error recording stock take:', error);
      // Create a mock stock take object for consistency
      stockTake = {
        id: 'temp-' + Date.now(),
        item_id: id,
        previous_stock: previousStock,
        new_stock: newStock,
        adjustment_amount: adjustmentAmount,
        take_date: new Date().toISOString(),
        notes,
        created_by: createdBy || 'system',
        created_at: new Date().toISOString()
      };
    }
    
    return { item: updatedItem, stockTake };
  },
};

// Stock Takes CRUD operations
export const stockTakesApi = {
  // Get stock take history
  async getHistory(
    itemId?: string,
    startDate?: string,
    endDate?: string,
    limit = 50,
    offset = 0
  ): Promise<StockTakeWithItem[]> {
    try {
      const client = await getSupabaseClient();
      let query = client
        .from('stock_takes')
        .select(`
          *,
          inventory_items!inner(name, item_type, unit_of_measure)
        `)
        .order('take_date', { ascending: false });
      
      if (itemId) query = query.eq('item_id', itemId);
      if (startDate) query = query.gte('take_date', startDate);
      if (endDate) query = query.lte('take_date', endDate);
      
      const { data, error } = await query
        .range(offset, offset + limit - 1);
      
      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          console.warn('Stock takes table not found, returning empty history');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.warn('Error fetching stock take history:', error);
      return [];
    }
  },

  // Get stock take by ID
  async getById(id: string): Promise<StockTakeWithItem | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from('stock_takes')
      .select(`
        *,
        inventory_items!inner(name, item_type, unit_of_measure)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get usage analytics for a specific item
  async getUsageAnalytics(
    itemId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalUsage: number;
    totalAdditions: number;
    usageRate: number;
    stockTakes: StockTakeWithItem[];
  }> {
    try {
      const stockTakes = await this.getHistory(itemId, startDate, endDate, 1000, 0);
      
      const totalUsage = stockTakes
        .filter(take => take.adjustment_amount < 0)
        .reduce((sum, take) => sum + Math.abs(take.adjustment_amount), 0);
      
      const totalAdditions = stockTakes
        .filter(take => take.adjustment_amount > 0)
        .reduce((sum, take) => sum + take.adjustment_amount, 0);
      
      const daysDiff = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const usageRate = totalUsage / daysDiff;
      
      return {
        totalUsage,
        totalAdditions,
        usageRate,
        stockTakes
      };
    } catch (error) {
      // If the stock_takes table doesn't exist yet, return empty analytics
      console.warn('Stock takes table not found, returning empty analytics:', error);
      return {
        totalUsage: 0,
        totalAdditions: 0,
        usageRate: 0,
        stockTakes: []
      };
    }
  },
};

// Welcome Pack Configurations CRUD operations
export const welcomePackConfigurationsApi = {
  // Get all configurations
  async getAll(): Promise<WelcomePackConfiguration[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get configuration by ID
  async getById(id: string): Promise<WelcomePackConfiguration | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get default configuration
  async getDefault(): Promise<WelcomePackConfiguration | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Create new configuration
  async create(config: CreateWelcomePackConfigurationData): Promise<WelcomePackConfiguration> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .insert({
        ...config,
        is_default: config.is_default ?? false,
        is_active: config.is_active ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update configuration
  async update(config: UpdateWelcomePackConfigurationData): Promise<WelcomePackConfiguration> {
    const { id, ...updateData } = config;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete configuration
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Configuration Items CRUD operations
export const welcomePackConfigurationItemsApi = {
  // Get items for a configuration
  async getByConfigurationId(configurationId: string): Promise<WelcomePackConfigurationItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATION_ITEMS)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .eq('configuration_id', configurationId)
      .order('created_at');
    
    if (error) throw error;
    return data || [];
  },

  // Create configuration item
  async create(item: CreateWelcomePackConfigurationItemData): Promise<WelcomePackConfigurationItem> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATION_ITEMS)
      .insert({
        ...item,
        is_optional: item.is_optional ?? false,
      })
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update configuration item
  async update(item: UpdateWelcomePackConfigurationItemData): Promise<WelcomePackConfigurationItem> {
    const { id, ...updateData } = item;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATION_ITEMS)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete configuration item
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATION_ITEMS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Distributions CRUD operations
export const welcomePackDistributionsApi = {
  // Get all distributions
  async getAll(): Promise<WelcomePackDistribution[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .select(`
        *,
        configuration:welcome_pack_configurations(*),
        apartment:apartments(*),
        booking:bookings(*),
        items:welcome_pack_distribution_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .order('distribution_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get distribution by ID
  async getById(id: string): Promise<WelcomePackDistribution | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .select(`
        *,
        configuration:welcome_pack_configurations(*),
        apartment:apartments(*),
        booking:bookings(*),
        items:welcome_pack_distribution_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get distributions by date range
  async getByDateRange(startDate: string, endDate: string): Promise<WelcomePackDistribution[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .select(`
        *,
        configuration:welcome_pack_configurations(*),
        apartment:apartments(*),
        booking:bookings(*),
        items:welcome_pack_distribution_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .gte('distribution_date', startDate)
      .lte('distribution_date', endDate)
      .order('distribution_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create new distribution
  async create(distribution: CreateWelcomePackDistributionData): Promise<WelcomePackDistribution> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .insert({
        ...distribution,
        distribution_date: distribution.distribution_date || new Date().toISOString().split('T')[0],
        status: distribution.status || 'prepared',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update distribution
  async update(distribution: UpdateWelcomePackDistributionData): Promise<WelcomePackDistribution> {
    const { id, ...updateData } = distribution;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete distribution
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Distribution Items CRUD operations
export const welcomePackDistributionItemsApi = {
  // Get items for a distribution
  async getByDistributionId(distributionId: string): Promise<WelcomePackDistributionItem[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTION_ITEMS)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .eq('distribution_id', distributionId)
      .order('created_at');
    
    if (error) throw error;
    return data || [];
  },

  // Create distribution item
  async create(item: CreateWelcomePackDistributionItemData): Promise<WelcomePackDistributionItem> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTION_ITEMS)
      .insert({
        ...item,
        quantity_declined: item.quantity_declined || 0,
      })
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update distribution item
  async update(item: UpdateWelcomePackDistributionItemData): Promise<WelcomePackDistributionItem> {
    const { id, ...updateData } = item;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTION_ITEMS)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete distribution item
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTION_ITEMS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Alerts CRUD operations
export const welcomePackAlertsApi = {
  // Get all alerts
  async getAll(): Promise<WelcomePackAlert[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ALERTS)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get unresolved alerts
  async getUnresolved(): Promise<WelcomePackAlert[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ALERTS)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create alert
  async create(alert: CreateWelcomePackAlertData): Promise<WelcomePackAlert> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ALERTS)
      .insert(alert)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update alert
  async update(alert: UpdateWelcomePackAlertData): Promise<WelcomePackAlert> {
    const { id, ...updateData } = alert;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.WELCOME_PACK_ALERTS)
      .update({
        ...updateData,
        resolved_at: updateData.is_resolved ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete alert
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.WELCOME_PACK_ALERTS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Welcome Pack Reports
export const welcomePackReportsApi = {
  // Get consumption report
  async getConsumptionReport(startDate: string, endDate: string): Promise<WelcomePackConsumptionReport> {
    const client = await getSupabaseClient();
    
    // Get distributions in date range
    const { data: distributions, error: distError } = await client
      .from(TABLES.WELCOME_PACK_DISTRIBUTIONS)
      .select(`
        id,
        distribution_date,
        total_cost,
        items:welcome_pack_distribution_items(
          quantity_issued,
          inventory_item:inventory_items(name)
        )
      `)
      .gte('distribution_date', startDate)
      .lte('distribution_date', endDate);
    
    if (distError) throw distError;
    
    // Calculate totals
    const totalDistributions = distributions?.length || 0;
    const totalCost = distributions?.reduce((sum: number, dist: any) => sum + (dist.total_cost || 0), 0) || 0;
    
    // Aggregate items consumed
    const itemsConsumed: { [key: string]: { quantity_issued: number; total_cost: number } } = {};
    
    distributions?.forEach(dist => {
      dist.items?.forEach((item: { inventory_item?: { name: string }; quantity_issued: number; unit_cost: number }) => {
        const itemName = item.inventory_item?.name || 'Unknown Item';
        if (!itemsConsumed[itemName]) {
          itemsConsumed[itemName] = { quantity_issued: 0, total_cost: 0 };
        }
        itemsConsumed[itemName].quantity_issued += item.quantity_issued || 0;
        // Note: We'd need to calculate cost per item, this is simplified
      });
    });
    
    return {
      period: `${startDate} to ${endDate}`,
      total_distributions: totalDistributions,
      total_cost: totalCost,
      items_consumed: Object.entries(itemsConsumed).map(([name, data]) => ({
        item_name: name,
        quantity_issued: data.quantity_issued,
        total_cost: data.total_cost,
      })),
    };
  },

  // Get cost analysis for a configuration
  async getCostAnalysis(configurationId: string): Promise<WelcomePackCostAnalysis> {
    const client = await getSupabaseClient();
    
    // Get configuration
    const { data: config, error: configError } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATIONS)
      .select('*')
      .eq('id', configurationId)
      .single();
    
    if (configError) throw configError;
    
    // Get configuration items with inventory details
    const { data: configItems, error: itemsError } = await client
      .from(TABLES.WELCOME_PACK_CONFIGURATION_ITEMS)
      .select(`
        quantity,
        inventory_item:inventory_items(name, current_stock)
      `)
      .eq('configuration_id', configurationId);
    
    if (itemsError) throw itemsError;
    
    // Calculate costs (simplified - would need actual pricing logic)
    const itemBreakdown = configItems?.map((item: { inventory_item?: { name: string }; quantity: number }) => ({
      item_name: item.inventory_item?.name || 'Unknown',
      quantity: item.quantity,
      unit_cost: 0, // Would need to get from inventory pricing
      total_cost: 0, // Would calculate based on unit cost
    })) || [];
    
    const totalCost = itemBreakdown.reduce((sum, item) => sum + item.total_cost, 0);
    
    return {
      configuration_id: configurationId,
      configuration_name: config.name,
      total_cost: totalCost,
      item_breakdown: itemBreakdown,
    };
  },
};

// Dashboard statistics
export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const client = await getSupabaseClient();
    
    // Get total apartments
    const { count: totalApartments } = await client
      .from(TABLES.APARTMENTS)
      .select('*', { count: 'exact', head: true });

    // Get total cleaners
    const { count: totalCleaners } = await client
      .from(TABLES.CLEANERS)
      .select('*', { count: 'exact', head: true });

    // Get total sessions
    const { count: totalSessions } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true });

    // Get sessions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    
    const { count: sessionsThisMonth } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .gte('cleaning_date', startOfMonth.toISOString().split('T')[0])
      .lte('cleaning_date', endOfMonth.toISOString().split('T')[0]);

    // Get upcoming sessions (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const { count: upcomingSessions } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .gte('cleaning_date', today.toISOString().split('T')[0])
      .lte('cleaning_date', nextWeek.toISOString().split('T')[0]);

    return {
      total_apartments: totalApartments || 0,
      total_cleaners: totalCleaners || 0,
      total_sessions: totalSessions || 0,
      sessions_this_month: sessionsThisMonth || 0,
      upcoming_sessions: upcomingSessions || 0,
    };
  },
};
