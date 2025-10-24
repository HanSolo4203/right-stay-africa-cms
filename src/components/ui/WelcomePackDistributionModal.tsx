'use client';

import { useState, useEffect } from 'react';
import { useWelcomePack } from '@/hooks/useWelcomePack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar, User, Package, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  CreateWelcomePackDistributionData,
  UpdateWelcomePackDistributionData,
  WelcomePackDistribution,
} from '@/lib/types';

interface WelcomePackDistributionModalProps {
  distributionId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function WelcomePackDistributionModal({
  distributionId,
  onClose,
  onSave,
}: WelcomePackDistributionModalProps) {
  const {
    configurations,
    distributions,
    createDistribution,
    updateDistribution,
  } = useWelcomePack();

  const [formData, setFormData] = useState({
    configuration_id: '',
    guest_name: '',
    guest_contact: '',
    distribution_date: new Date().toISOString().split('T')[0],
    prepared_by_staff: '',
    notes: '',
    status: 'prepared' as 'prepared' | 'delivered' | 'declined' | 'partial',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!distributionId;

  // Load distribution data when editing
  useEffect(() => {
    if (distributionId) {
      const distribution = distributions.find(d => d.id === distributionId);
      if (distribution) {
        setFormData({
          configuration_id: distribution.configuration_id,
          guest_name: distribution.guest_name || '',
          guest_contact: distribution.guest_contact || '',
          distribution_date: distribution.distribution_date,
          prepared_by_staff: distribution.prepared_by_staff || '',
          notes: distribution.notes || '',
          status: distribution.status,
        });
      }
    }
  }, [distributionId, distributions]);

  const handleSubmit = async () => {
    if (!formData.configuration_id) {
      toast.error('Please select a configuration');
      return;
    }

    if (!formData.prepared_by_staff.trim()) {
      toast.error('Please enter staff member name');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        const updateData: UpdateWelcomePackDistributionData = {
          id: distributionId!,
          ...formData,
        };
        await updateDistribution(updateData);
        toast.success('Distribution updated successfully');
      } else {
        const createData: CreateWelcomePackDistributionData = formData;
        await createDistribution(createData);
        toast.success('Distribution created successfully');
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving distribution:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} distribution`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Edit Welcome Pack Distribution' : 'Create Welcome Pack Distribution'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the welcome pack distribution details'
              : 'Create a new welcome pack distribution record'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="configuration">Welcome Pack Configuration *</Label>
              <Select
                value={formData.configuration_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, configuration_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {configurations.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex items-center gap-2">
                        <span>{config.name}</span>
                        {config.is_default && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guest_name">Guest Name</Label>
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                  placeholder="Enter guest name"
                />
              </div>
              <div>
                <Label htmlFor="guest_contact">Guest Contact</Label>
                <Input
                  id="guest_contact"
                  value={formData.guest_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_contact: e.target.value }))}
                  placeholder="Enter guest contact"
                />
              </div>
            </div>
          </div>

          {/* Distribution Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Distribution Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distribution_date">Distribution Date *</Label>
                <Input
                  id="distribution_date"
                  type="date"
                  value={formData.distribution_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, distribution_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="prepared_by_staff">Prepared by Staff *</Label>
                <Input
                  id="prepared_by_staff"
                  value={formData.prepared_by_staff}
                  onChange={(e) => setFormData(prev => ({ ...prev, prepared_by_staff: e.target.value }))}
                  placeholder="Enter staff member name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, status: value as "prepared" | "delivered" | "declined" | "partial" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepared">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Prepared
                    </div>
                  </SelectItem>
                  <SelectItem value="delivered">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Delivered
                    </div>
                  </SelectItem>
                  <SelectItem value="declined">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-500"></div>
                      Declined
                    </div>
                  </SelectItem>
                  <SelectItem value="partial">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                      Partial
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Status Information */}
          {formData.status !== 'prepared' && (
            <Alert>
              <AlertDescription>
                <strong>Status:</strong> {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                {formData.status === 'delivered' && ' - Welcome pack has been delivered to guest'}
                {formData.status === 'declined' && ' - Guest declined the welcome pack'}
                {formData.status === 'partial' && ' - Some items were declined by guest'}
              </AlertDescription>
            </Alert>
          )}
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
              isEditing ? 'Update Distribution' : 'Create Distribution'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
