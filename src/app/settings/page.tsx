'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Bell, Shield, Palette, Package, Plus, Edit, Trash2, CreditCard } from 'lucide-react';
import CleanersList from '@/components/ui/CleanersList';
import ApartmentsList from '@/components/ui/ApartmentsList';
import AuthWrapper from '@/components/AuthWrapper';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { WelcomePackItem, BankAccountDetail, CreateBankAccountDetailData } from '@/lib/types';

function SettingsContent() {
  const [activeTab, setActiveTab] = useState('cleaners');
  const [welcomePackItems, setWelcomePackItems] = useState<WelcomePackItem[]>([]);
  const [isAddingWelcomePack, setIsAddingWelcomePack] = useState(false);
  const [editingWelcomePackId, setEditingWelcomePackId] = useState<string | null>(null);
  const [welcomePackForm, setWelcomePackForm] = useState({ name: '', price: 0, is_active: true });
  const [isLoadingWelcomePack, setIsLoadingWelcomePack] = useState(false);
  
  // Bank Account Details state
  const [bankAccounts, setBankAccounts] = useState<BankAccountDetail[]>([]);
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [editingBankAccountId, setEditingBankAccountId] = useState<string | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState<CreateBankAccountDetailData>({
    account_name: '',
    beneficiary_name: '',
    account_number: '',
    branch_code: '',
    bank_name: '',
    is_default: false,
    is_active: true,
  });
  const [isLoadingBankAccount, setIsLoadingBankAccount] = useState(false);

  // Load welcome pack items
  const loadWelcomePackItems = async () => {
    try {
      setIsLoadingWelcomePack(true);
      const response = await fetch('/api/settings/welcome-pack');
      const result = await response.json();
      
      if (result.success) {
        setWelcomePackItems(result.data);
      } else {
        toast.error('Failed to load welcome pack items');
      }
    } catch {
      toast.error('Failed to load welcome pack items');
    } finally {
      setIsLoadingWelcomePack(false);
    }
  };

  // Add new welcome pack item
  const addWelcomePackItem = async () => {
    try {
      setIsLoadingWelcomePack(true);
      const response = await fetch('/api/settings/welcome-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(welcomePackForm),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWelcomePackItems(prev => [result.data, ...prev]);
        setIsAddingWelcomePack(false);
        setWelcomePackForm({ name: '', price: 0, is_active: true });
        toast.success('Welcome pack item added successfully');
      } else {
        toast.error(result.error || 'Failed to add welcome pack item');
      }
    } catch {
      toast.error('Failed to add welcome pack item');
    } finally {
      setIsLoadingWelcomePack(false);
    }
  };

  // Update welcome pack item
  const updateWelcomePackItem = async (id: string) => {
    try {
      setIsLoadingWelcomePack(true);
      const response = await fetch(`/api/settings/welcome-pack/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(welcomePackForm),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWelcomePackItems(prev => prev.map(item => 
          item.id === id ? result.data : item
        ));
        setEditingWelcomePackId(null);
        setWelcomePackForm({ name: '', price: 0, is_active: true });
        toast.success('Welcome pack item updated successfully');
      } else {
        toast.error(result.error || 'Failed to update welcome pack item');
      }
    } catch {
      toast.error('Failed to update welcome pack item');
    } finally {
      setIsLoadingWelcomePack(false);
    }
  };

  // Delete welcome pack item
  const deleteWelcomePackItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this welcome pack item?')) {
      return;
    }

    try {
      setIsLoadingWelcomePack(true);
      const response = await fetch(`/api/settings/welcome-pack/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWelcomePackItems(prev => prev.filter(item => item.id !== id));
        toast.success('Welcome pack item deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete welcome pack item');
      }
    } catch {
      toast.error('Failed to delete welcome pack item');
    } finally {
      setIsLoadingWelcomePack(false);
    }
  };

  // Start adding new welcome pack item
  const startAddingWelcomePack = () => {
    setWelcomePackForm({ name: '', price: 0, is_active: true });
    setIsAddingWelcomePack(true);
    setEditingWelcomePackId(null);
  };

  // Start editing welcome pack item
  const startEditingWelcomePack = (item: WelcomePackItem) => {
    setWelcomePackForm({
      name: item.name,
      price: item.price,
      is_active: item.is_active
    });
    setEditingWelcomePackId(item.id);
    setIsAddingWelcomePack(false);
  };

  // Cancel editing/adding
  const cancelEditingWelcomePack = () => {
    setIsAddingWelcomePack(false);
    setEditingWelcomePackId(null);
    setWelcomePackForm({ name: '', price: 0, is_active: true });
  };

  // Load bank account details
  const loadBankAccounts = async () => {
    try {
      setIsLoadingBankAccount(true);
      const response = await fetch('/api/settings/bank-accounts');
      const result = await response.json();
      
      if (result.success) {
        setBankAccounts(result.data);
      } else {
        toast.error('Failed to load bank account details');
      }
    } catch {
      toast.error('Failed to load bank account details');
    } finally {
      setIsLoadingBankAccount(false);
    }
  };

  // Add new bank account
  const addBankAccount = async () => {
    try {
      setIsLoadingBankAccount(true);
      const response = await fetch('/api/settings/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankAccountForm),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBankAccounts(prev => [result.data, ...prev]);
        setIsAddingBankAccount(false);
        setBankAccountForm({
          account_name: '',
          beneficiary_name: '',
          account_number: '',
          branch_code: '',
          bank_name: '',
          is_default: false,
          is_active: true,
        });
        toast.success('Bank account detail added successfully');
      } else {
        toast.error(result.error || 'Failed to add bank account detail');
      }
    } catch {
      toast.error('Failed to add bank account detail');
    } finally {
      setIsLoadingBankAccount(false);
    }
  };

  // Update bank account
  const updateBankAccount = async (id: string) => {
    try {
      setIsLoadingBankAccount(true);
      const response = await fetch(`/api/settings/bank-accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankAccountForm),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBankAccounts(prev => prev.map(item => 
          item.id === id ? result.data : item
        ));
        setEditingBankAccountId(null);
        setBankAccountForm({
          account_name: '',
          beneficiary_name: '',
          account_number: '',
          branch_code: '',
          bank_name: '',
          is_default: false,
          is_active: true,
        });
        toast.success('Bank account detail updated successfully');
      } else {
        toast.error(result.error || 'Failed to update bank account detail');
      }
    } catch {
      toast.error('Failed to update bank account detail');
    } finally {
      setIsLoadingBankAccount(false);
    }
  };

  // Delete bank account
  const deleteBankAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account detail?')) {
      return;
    }

    try {
      setIsLoadingBankAccount(true);
      const response = await fetch(`/api/settings/bank-accounts/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBankAccounts(prev => prev.filter(item => item.id !== id));
        toast.success('Bank account detail deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete bank account detail');
      }
    } catch {
      toast.error('Failed to delete bank account detail');
    } finally {
      setIsLoadingBankAccount(false);
    }
  };

  // Start adding new bank account
  const startAddingBankAccount = () => {
    setBankAccountForm({
      account_name: '',
      beneficiary_name: '',
      account_number: '',
      branch_code: '',
      bank_name: '',
      is_default: false,
      is_active: true,
    });
    setIsAddingBankAccount(true);
    setEditingBankAccountId(null);
  };

  // Start editing bank account
  const startEditingBankAccount = (account: BankAccountDetail) => {
    setBankAccountForm({
      account_name: account.account_name,
      beneficiary_name: account.beneficiary_name,
      account_number: account.account_number,
      branch_code: account.branch_code,
      bank_name: account.bank_name,
      is_default: account.is_default,
      is_active: account.is_active,
    });
    setEditingBankAccountId(account.id);
    setIsAddingBankAccount(false);
  };

  // Cancel editing/adding
  const cancelEditingBankAccount = () => {
    setIsAddingBankAccount(false);
    setEditingBankAccountId(null);
    setBankAccountForm({
      account_name: '',
      beneficiary_name: '',
      account_number: '',
      branch_code: '',
      bank_name: '',
      is_default: false,
      is_active: true,
    });
  };

  // Load data when component mounts
  useEffect(() => {
    loadWelcomePackItems();
    loadBankAccounts();
  }, []);

  const tabs = [
    { id: 'cleaners', name: 'Cleaners', icon: Users },
    { id: 'properties', name: 'Properties', icon: Building2 },
    { id: 'welcome-pack', name: 'Welcome Pack', icon: Package },
    { id: 'bank-accounts', name: 'Bank Accounts', icon: CreditCard },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
  ];

  const renderCleanersTab = () => (
    <div className="space-y-6">
      <CleanersList />
    </div>
  );

  const renderApartmentsTab = () => (
    <div className="space-y-6">
      <ApartmentsList />
    </div>
  );

  const renderWelcomePackTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Welcome Pack Items</h2>
        <button
          onClick={startAddingWelcomePack}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Welcome Pack
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {(isAddingWelcomePack || editingWelcomePackId) && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isAddingWelcomePack ? 'Add New Welcome Pack' : 'Edit Welcome Pack'}
            </h3>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Pack Name
              </label>
              <input
                type="text"
                value={welcomePackForm.name}
                onChange={(e) => setWelcomePackForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter welcome pack name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (R)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={welcomePackForm.price}
                onChange={(e) => setWelcomePackForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter price in Rands"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={welcomePackForm.is_active}
                onChange={(e) => setWelcomePackForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => isAddingWelcomePack ? addWelcomePackItem() : updateWelcomePackItem(editingWelcomePackId!)}
                disabled={isLoadingWelcomePack}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingWelcomePack ? 'Saving...' : (isAddingWelcomePack ? 'Add Welcome Pack' : 'Save Changes')}
              </button>
              <button
                onClick={cancelEditingWelcomePack}
                disabled={isLoadingWelcomePack}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Welcome Pack Items List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Welcome Pack Items</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your welcome pack offerings
          </p>
        </div>
        
        <div className="px-6 py-4">
          {isLoadingWelcomePack ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : welcomePackItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No welcome pack items</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first welcome pack item.</p>
              <div className="mt-6">
                <button
                  onClick={startAddingWelcomePack}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Welcome Pack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {welcomePackItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{item.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">R {item.price.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditingWelcomePack(item)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteWelcomePackItem(item.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );



  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
      
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          {[
            { label: 'New cleaning session scheduled', enabled: true },
            { label: 'Session completed', enabled: true },
            { label: 'Session cancelled', enabled: true },
            { label: 'Cleaner unavailable', enabled: false },
            { label: 'Monthly reports', enabled: true },
          ].map((notification, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-900">{notification.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={notification.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
      
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Password & Authentication</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );

  const renderBankAccountsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Bank Account Details</h2>
        <button
          onClick={startAddingBankAccount}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Bank Account
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {(isAddingBankAccount || editingBankAccountId) && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isAddingBankAccount ? 'Add New Bank Account' : 'Edit Bank Account'}
            </h3>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={bankAccountForm.account_name}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, account_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Main Account, Business Account"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beneficiary Name *
              </label>
              <input
                type="text"
                value={bankAccountForm.beneficiary_name}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Right Stay (PTY) LTD"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankAccountForm.account_number}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, account_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter account number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={bankAccountForm.branch_code}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, branch_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter branch code"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name *
              </label>
              <input
                type="text"
                value={bankAccountForm.bank_name}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, bank_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., First National Bank (FNB/RMB)"
              />
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={bankAccountForm.is_default}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Set as Default
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={bankAccountForm.is_active}
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => isAddingBankAccount ? addBankAccount() : updateBankAccount(editingBankAccountId!)}
                disabled={isLoadingBankAccount}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingBankAccount ? 'Saving...' : (isAddingBankAccount ? 'Add Bank Account' : 'Save Changes')}
              </button>
              <button
                onClick={cancelEditingBankAccount}
                disabled={isLoadingBankAccount}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bank Accounts List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Bank Account Details</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage bank account details for invoices
          </p>
        </div>
        
        <div className="px-6 py-4">
          {isLoadingBankAccount ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bank account details</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first bank account detail.</p>
              <div className="mt-6">
                <button
                  onClick={startAddingBankAccount}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bank Account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{account.account_name}</h4>
                      {account.is_default && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Beneficiary:</span> {account.beneficiary_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Account:</span> {account.account_number} | 
                      <span className="font-medium"> Branch:</span> {account.branch_code} | 
                      <span className="font-medium"> Bank:</span> {account.bank_name}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditingBankAccount(account)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBankAccount(account.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Appearance Settings</h2>
      
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Theme</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Light', preview: 'bg-white border-gray-300' },
              { name: 'Dark', preview: 'bg-gray-800 border-gray-600' },
              { name: 'Auto', preview: 'bg-gradient-to-r from-white to-gray-800 border-gray-400' },
            ].map((theme, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 rounded-lg border-2 mx-auto mb-2 ${theme.preview}`}></div>
                <span className="text-sm text-gray-900">{theme.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cleaners':
        return renderCleanersTab();
      case 'properties':
        return renderApartmentsTab();
      case 'welcome-pack':
        return renderWelcomePackTab();
      case 'bank-accounts':
        return renderBankAccountsTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      case 'appearance':
        return renderAppearanceTab();
      default:
        return renderCleanersTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your cleaning management system preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default function Settings() {
  return (
    <AuthWrapper>
      <SettingsContent />
    </AuthWrapper>
  );
}
