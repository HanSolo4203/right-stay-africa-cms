'use client';

import { useState, useEffect } from 'react';
import { useWelcomePack } from '@/hooks/useWelcomePack';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  CreateWelcomePackConfigurationData,
  UpdateWelcomePackConfigurationData,
  CreateWelcomePackConfigurationItemData,
} from '@/lib/types';

interface WelcomePackConfigurationModalProps {
  configurationId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

interface ConfigurationItem {
  id?: string;
  inventory_item_id: string;
  quantity: number;
  is_optional: boolean;
  inventory_item?: {
    name: string;
    current_stock: number;
  };
}

export function WelcomePackConfigurationModal({
  configurationId,
  onClose,
  onSave,
}: WelcomePackConfigurationModalProps) {
  const {
    configurations,
    getConfigurationItems,
    createConfiguration,
    updateConfiguration,
    createConfigurationItem,
    updateConfigurationItem,
  } = useWelcomePack();

  const { welcomePacks } = useInventory();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    is_active: true,
  });

  const [configurationItems, setConfigurationItems] = useState<ConfigurationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!configurationId;

  // Load configuration data when editing
  useEffect(() => {
    if (configurationId) {
      const config = configurations.find(c => c.id === configurationId);
      if (config) {
        setFormData({
          name: config.name,
          description: config.description || '',
          is_default: config.is_default,
          is_active: config.is_active,
        });
      }
    }
  }, [configurationId, configurations]);

  // Load configuration items when editing
  useEffect(() => {
    if (configurationId) {
      const loadItems = async () => {
        setIsLoading(true);
        try {
          const items = await getConfigurationItems(configurationId);
          setConfigurationItems(items.map(item => ({
            id: item.id,
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            is_optional: item.is_optional,
            inventory_item: item.inventory_item,
          })));
        } catch (error) {
          console.error('Error loading configuration items:', error);
          toast.error('Failed to load configuration items');
        } finally {
          setIsLoading(false);
        }
      };
      loadItems();
    }
  }, [configurationId, getConfigurationItems]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Configuration name is required');
      return;
    }

    if (configurationItems.length === 0) {
      toast.error('Please add at least one item to the configuration');
      return;
    }

    setIsSubmitting(true);

    try {
      let configId: string;

      if (isEditing) {
        const updateData: UpdateWelcomePackConfigurationData = {
          id: configurationId!,
          ...formData,
        };
        await updateConfiguration(updateData);
        configId = configurationId!;
      } else {
        const createData: CreateWelcomePackConfigurationData = formData;
        const newConfig = await createConfiguration(createData);
        configId = newConfig.id;
      }

      // Save configuration items
      for (const item of configurationItems) {
        const itemData: CreateWelcomePackConfigurationItemData = {
          configuration_id: configId,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          is_optional: item.is_optional,
        };

        if (item.id) {
          // Update existing item
          await updateConfigurationItem({
            id: item.id,
            ...itemData,
          });
        } else {
          // Create new item
          await createConfigurationItem(itemData);
        }
      }

      toast.success(`Configuration ${isEditing ? 'updated' : 'created'} successfully`);
      onSave();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} configuration`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setConfigurationItems(prev => [...prev, {
      inventory_item_id: '',
      quantity: 1,
      is_optional: false,
    }]);
  };

  const removeItem = (index: number) => {
    setConfigurationItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ConfigurationItem, value: string | number | boolean) => {
    setConfigurationItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Edit Welcome Pack Configuration' : 'Create Welcome Pack Configuration'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the welcome pack configuration and its items'
              : 'Create a new welcome pack configuration with items and quantities'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter configuration name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked as boolean }))}
                />
                <Label htmlFor="is_default">Set as default configuration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          {/* Configuration Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configuration Items</h3>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading items...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {configurationItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`item-${index}`}>Inventory Item *</Label>
                        <Select
                          value={item.inventory_item_id}
                          onValueChange={(value) => updateItem(index, 'inventory_item_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {welcomePacks.map((inventoryItem) => (
                              <SelectItem key={inventoryItem.id} value={inventoryItem.id}>
                                {inventoryItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.inventory_item && (
                          <div className="mt-1">
                            <Badge variant="outline">
                              Stock: {item.inventory_item.current_stock}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`optional-${index}`}
                          checked={item.is_optional}
                          onCheckedChange={(checked) => updateItem(index, 'is_optional', checked)}
                        />
                        <Label htmlFor={`optional-${index}`}>Optional</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {configurationItems.length === 0 && (
              <Alert>
                <AlertDescription>
                  No items added yet. Click &quot;Add Item&quot; to start building your welcome pack configuration.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Configuration' : 'Create Configuration'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
