'use client';

import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem, UpdateInventoryItemData, CreateInventoryItemData } from '@/lib/types';
import { Package, Plus, AlertTriangle, TrendingUp, FileText, ClipboardCheck, BarChart3, History } from 'lucide-react';
import toast from 'react-hot-toast';
import InventoryItemsTable from '@/components/ui/InventoryItemsTable';
import AddEditInventoryModal from '@/components/ui/AddEditInventoryModal';
import AddStockModal from '@/components/ui/AddStockModal';
import StockTakeModal from '@/components/ui/StockTakeModal';
import InventoryAnalytics from '@/components/ui/InventoryAnalytics';
import DetergentUsageAnalytics from '@/components/ui/DetergentUsageAnalytics';
import StockTakeHistory from '@/components/ui/StockTakeHistory';
import LowStockItems from '@/components/ui/LowStockItems';

export default function InventoryPage() {
  const { 
    detergents, 
    welcomePacks, 
    lowStockItems, 
    loading, 
    error, 
    createItem, 
    updateItem, 
    deleteItem,
    addStock,
    performStockTake,
    getStockTakeHistory,
    getUsageAnalytics
  } = useInventory();
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'detergent' | 'welcome_pack'>('detergent');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showStockTakeModal, setShowStockTakeModal] = useState(false);
  const [stockTakeItem, setStockTakeItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'usage' | 'history'>('inventory');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddItem = (type: 'detergent' | 'welcome_pack') => {
    setModalType(type);
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setModalType(item.item_type);
    setShowModal(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await deleteItem(item.id);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleSaveItem = async (data: Partial<InventoryItem>) => {
    try {
      if (editingItem && editingItem.id) {
        await updateItem(editingItem.id, data as UpdateInventoryItemData);
      } else {
        await createItem({ ...data, item_type: modalType } as CreateInventoryItemData);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleAddStock = async (data: { item_id: string; quantity: number; price: number }) => {
    try {
      await addStock(data.item_id, {
        quantity: data.quantity,
        price: data.price
      });
      setShowAddStockModal(false);
    } catch (error) {
      console.error('Error adding stock:', error);
    }
  };

  const handleStockTake = (item: InventoryItem) => {
    setStockTakeItem(item);
    setShowStockTakeModal(true);
  };

  const handleStockTakeSuccess = () => {
    setShowStockTakeModal(false);
    setStockTakeItem(null);
    // Trigger refresh of analytics and history
    setRefreshTrigger(prev => prev + 1);
    // Show success message
    toast.success('Stock take recorded successfully! Analytics updated.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Inventory Stock</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('/inventory/invoice', '_blank')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Invoice
              </button>
              <button
                onClick={() => setShowAddStockModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Add Stock
              </button>
            </div>
          </div>
          <p className="mt-2 text-gray-600">
            Track your detergent and welcome pack stock levels
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Detergent Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {detergents.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Welcome Pack Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {welcomePacks.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {lowStockItems.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Section */}
        {lowStockItems.length > 0 && (
          <div className="mb-8">
            <LowStockItems 
              items={lowStockItems}
              onAddStock={() => {
                // Open the add stock modal
                setShowAddStockModal(true);
              }}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'inventory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Inventory
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'usage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ClipboardCheck className="h-4 w-4 inline mr-2" />
                Usage Analytics
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="h-4 w-4 inline mr-2" />
                Stock Take History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <>
            {/* Detergents Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Detergents</h2>
                <button
                  onClick={() => handleAddItem('detergent')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Detergent
                </button>
              </div>
              <InventoryItemsTable
                items={detergents}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onStockTake={handleStockTake}
              />
            </div>

            {/* Welcome Pack Items Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Welcome Pack Items</h2>
                <button
                  onClick={() => handleAddItem('welcome_pack')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Welcome Pack Item
                </button>
              </div>
              <InventoryItemsTable
                items={welcomePacks}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <InventoryAnalytics 
            detergents={detergents}
            welcomePacks={welcomePacks}
            lowStockItems={lowStockItems}
          />
        )}

        {activeTab === 'usage' && (
          <DetergentUsageAnalytics
            detergents={detergents}
            getUsageAnalytics={getUsageAnalytics}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'history' && (
          <StockTakeHistory
            items={[...detergents, ...welcomePacks]}
            getStockTakeHistory={getStockTakeHistory}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <AddEditInventoryModal
            item={editingItem}
            itemType={modalType}
            onSave={handleSaveItem}
            onClose={() => {
              setShowModal(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <AddStockModal
            isOpen={showAddStockModal}
            onClose={() => setShowAddStockModal(false)}
            onSave={handleAddStock}
            items={[...detergents, ...welcomePacks]}
            loading={loading}
          />
        )}

        {/* Stock Take Modal */}
        {showStockTakeModal && stockTakeItem && (
          <StockTakeModal
            item={stockTakeItem}
            isOpen={showStockTakeModal}
            onClose={() => {
              setShowStockTakeModal(false);
              setStockTakeItem(null);
            }}
            onSuccess={handleStockTakeSuccess}
            performStockTake={performStockTake}
          />
        )}
      </div>
    </div>
  );
}
