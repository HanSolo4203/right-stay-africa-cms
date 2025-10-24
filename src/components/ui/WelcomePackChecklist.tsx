'use client';

import { useState, useEffect } from 'react';
import { useWelcomePack } from '@/hooks/useWelcomePack';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WelcomePackChecklistProps {
  bookingId?: string;
  apartmentId?: string;
  guestName?: string;
  guestContact?: string;
  onDistributionComplete?: (distributionId: string) => void;
}

interface ChecklistItem {
  id: string;
  name: string;
  quantity: number;
  isOptional: boolean;
  isChecked: boolean;
  isDeclined: boolean;
  notes?: string;
  currentStock: number;
  unitCost?: number;
}

export function WelcomePackChecklist({
  bookingId,
  apartmentId,
  guestName,
  guestContact,
  onDistributionComplete,
}: WelcomePackChecklistProps) {
  const { 
    defaultConfiguration, 
    fetchDefaultConfiguration, 
    createDistribution,
    getConfigurationItems,
    createDistributionItem,
    loading: welcomePackLoading 
  } = useWelcomePack();
  
  const { 
    fetchByType, 
    loading: inventoryLoading 
  } = useInventory();

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [preparedByStaff, setPreparedByStaff] = useState('');
  const [distributionNotes, setDistributionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  // Load default configuration and inventory items
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchDefaultConfiguration(),
        fetchByType('welcome_pack'),
      ]);
    };
    loadData();
  }, [fetchDefaultConfiguration, fetchByType]);

  // Load configuration items when default configuration is available
  useEffect(() => {
    const loadConfigurationItems = async () => {
      if (defaultConfiguration) {
        try {
          const items = await getConfigurationItems(defaultConfiguration.id);
          const checklistData: ChecklistItem[] = items.map(item => ({
            id: item.inventory_item_id,
            name: item.inventory_item?.name || 'Unknown Item',
            quantity: item.quantity,
            isOptional: item.is_optional,
            isChecked: false,
            isDeclined: false,
            currentStock: item.inventory_item?.current_stock || 0,
            unitCost: 0, // Would need to get from inventory pricing
          }));
          setChecklistItems(checklistData);
        } catch (error) {
          console.error('Error loading configuration items:', error);
          toast.error('Failed to load welcome pack items');
        }
      }
    };
    loadConfigurationItems();
  }, [defaultConfiguration, getConfigurationItems]);

  // Calculate total cost
  useEffect(() => {
    const cost = checklistItems.reduce((total, item) => {
      if (item.isChecked && !item.isDeclined) {
        return total + (item.unitCost || 0) * item.quantity;
      }
      return total;
    }, 0);
    setTotalCost(cost);
  }, [checklistItems]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isChecked: checked, isDeclined: false }
        : item
    ));
  };

  const handleItemDecline = (itemId: string, declined: boolean) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isDeclined: declined, isChecked: !declined }
        : item
    ));
  };

  const handleItemNotes = (itemId: string, notes: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, notes }
        : item
    ));
  };

  const handleSubmit = async () => {
    if (!defaultConfiguration) {
      toast.error('No default welcome pack configuration found');
      return;
    }

    if (!preparedByStaff.trim()) {
      toast.error('Please enter staff member name');
      return;
    }

    const checkedItems = checklistItems.filter(item => item.isChecked && !item.isDeclined);
    if (checkedItems.length === 0) {
      toast.error('Please select at least one item for the welcome pack');
      return;
    }

    // Check stock availability
    const insufficientStock = checkedItems.filter(item => item.currentStock < item.quantity);
    if (insufficientStock.length > 0) {
      toast.error(`Insufficient stock for: ${insufficientStock.map(item => item.name).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create distribution
      const distribution = await createDistribution({
        booking_id: bookingId,
        apartment_id: apartmentId,
        configuration_id: defaultConfiguration.id,
        guest_name: guestName,
        guest_contact: guestContact,
        prepared_by_staff: preparedByStaff,
        notes: distributionNotes,
        status: 'prepared',
      });

      // Create distribution items
      for (const item of checkedItems) {
        await createDistributionItem({
          distribution_id: distribution.id,
          inventory_item_id: item.id,
          quantity_issued: item.quantity,
          quantity_declined: 0,
          unit_cost: item.unitCost,
          total_cost: (item.unitCost || 0) * item.quantity,
          notes: item.notes,
        });
      }

      toast.success('Welcome pack prepared successfully!');
      onDistributionComplete?.(distribution.id);
    } catch (error) {
      console.error('Error creating welcome pack distribution:', error);
      toast.error('Failed to prepare welcome pack');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = welcomePackLoading || inventoryLoading;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading welcome pack checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!defaultConfiguration) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No default welcome pack configuration found. Please contact an administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const checkedItems = checklistItems.filter(item => item.isChecked && !item.isDeclined);
  const declinedItems = checklistItems.filter(item => item.isDeclined);
  const insufficientStock = checklistItems.filter(item => item.currentStock < item.quantity);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Welcome Pack Checklist
          </CardTitle>
          <CardDescription>
            Prepare welcome pack for guest check-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Guest Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guestName">Guest Name</Label>
              <Input
                id="guestName"
                value={guestName || ''}
                disabled
                placeholder="Guest name"
              />
            </div>
            <div>
              <Label htmlFor="guestContact">Guest Contact</Label>
              <Input
                id="guestContact"
                value={guestContact || ''}
                disabled
                placeholder="Guest contact"
              />
            </div>
          </div>

          {/* Staff Information */}
          <div>
            <Label htmlFor="preparedBy">Prepared by Staff Member *</Label>
            <Input
              id="preparedBy"
              value={preparedByStaff}
              onChange={(e) => setPreparedByStaff(e.target.value)}
              placeholder="Enter staff member name"
              required
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Welcome Pack Items</h3>
            {checklistItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.isChecked}
                      onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                      disabled={item.currentStock < item.quantity}
                    />
                    <Label htmlFor={`item-${item.id}`} className="font-medium">
                      {item.name}
                    </Label>
                    <Badge variant="outline">
                      Qty: {item.quantity}
                    </Badge>
                    {item.isOptional && (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={item.currentStock >= item.quantity ? "default" : "destructive"}
                    >
                      Stock: {item.currentStock}
                    </Badge>
                    {item.currentStock < item.quantity && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                {item.isChecked && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`decline-${item.id}`}
                          checked={item.isDeclined}
                          onCheckedChange={(declined) => handleItemDecline(item.id, declined as boolean)}
                        />
                        <Label htmlFor={`decline-${item.id}`} className="text-sm">
                          Guest declined this item
                        </Label>
                      </div>
                    </div>
                    
                    {!item.isDeclined && (
                      <div>
                        <Label htmlFor={`notes-${item.id}`} className="text-sm">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`notes-${item.id}`}
                          value={item.notes || ''}
                          onChange={(e) => handleItemNotes(item.id, e.target.value)}
                          placeholder="Add notes for this item..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Summary</h3>
            <div className="flex justify-between">
              <span>Items selected:</span>
              <span>{checkedItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Items declined:</span>
              <span>{declinedItems.length}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Estimated cost:</span>
              <span>R {totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Alerts */}
          {insufficientStock.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Insufficient stock for:</strong> {insufficientStock.map(item => item.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="distributionNotes">Additional Notes</Label>
            <Textarea
              id="distributionNotes"
              value={distributionNotes}
              onChange={(e) => setDistributionNotes(e.target.value)}
              placeholder="Add any additional notes for this welcome pack..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || insufficientStock.length > 0 || !preparedByStaff.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Preparing Welcome Pack...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Prepare Welcome Pack
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
