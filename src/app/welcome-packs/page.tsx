'use client';

import { useState } from 'react';
import { useWelcomePack } from '@/hooks/useWelcomePack';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Settings, 
  History, 
  AlertTriangle, 
  BarChart3,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { WelcomePackConfigurationModal } from '@/components/ui/WelcomePackConfigurationModal';
import { WelcomePackDistributionModal } from '@/components/ui/WelcomePackDistributionModal';
import { WelcomePackReportsModal } from '@/components/ui/WelcomePackReportsModal';

export default function WelcomePacksPage() {
  const {
    configurations,
    distributions,
    alerts,
    unresolvedAlerts,
    loading,
    error,
    fetchConfigurations,
    fetchDistributions,
    fetchAlerts,
    deleteConfiguration,
    deleteDistribution,
    updateAlert,
  } = useWelcomePack();

  const { welcomePacks, lowStockItems } = useInventory();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editingDistribution, setEditingDistribution] = useState<string | null>(null);

  const handleDeleteConfiguration = async (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteConfiguration(id);
        toast.success('Configuration deleted successfully');
      } catch (error) {
        toast.error('Failed to delete configuration');
      }
    }
  };

  const handleDeleteDistribution = async (id: string) => {
    if (confirm('Are you sure you want to delete this distribution?')) {
      try {
        await deleteDistribution(id);
        toast.success('Distribution deleted successfully');
      } catch (error) {
        toast.error('Failed to delete distribution');
      }
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateAlert({
        id: alertId,
        is_resolved: true,
        resolved_by: 'Current User', // Would get from auth context
      });
      toast.success('Alert resolved');
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading welcome pack data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome Pack Management</h1>
          <p className="text-gray-600">Manage welcome pack configurations, distributions, and reports</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowConfigModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </Button>
          <Button onClick={() => setShowDistributionModal(true)} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            New Distribution
          </Button>
          <Button onClick={() => setShowReportsModal(true)} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{unresolvedAlerts.length} unresolved alerts:</strong> 
            {unresolvedAlerts.slice(0, 3).map(alert => alert.message).join(', ')}
            {unresolvedAlerts.length > 3 && ` and ${unresolvedAlerts.length - 3} more...`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{configurations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Welcome pack configurations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distributions</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{distributions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Welcome packs distributed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unresolved Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unresolvedAlerts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Items need attention
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items</CardTitle>
                <CardDescription>Items that need restocking</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All items are well stocked</p>
                ) : (
                  <div className="space-y-2">
                    {lowStockItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="destructive">
                          {item.current_stock} left
                        </Badge>
                      </div>
                    ))}
                    {lowStockItems.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        And {lowStockItems.length - 5} more items...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Distributions</CardTitle>
                <CardDescription>Latest welcome pack distributions</CardDescription>
              </CardHeader>
              <CardContent>
                {distributions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No distributions yet</p>
                ) : (
                  <div className="space-y-2">
                    {distributions.slice(0, 5).map((distribution) => (
                      <div key={distribution.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{distribution.guest_name || 'Unknown Guest'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(distribution.distribution_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={distribution.status === 'delivered' ? 'default' : 'secondary'}>
                          {distribution.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configurations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configurations.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <div className="flex space-x-1">
                      {config.is_default && (
                        <Badge variant="default">Default</Badge>
                      )}
                      {!config.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingConfig(config.id);
                        setShowConfigModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConfiguration(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="distributions" className="space-y-4">
          <div className="space-y-4">
            {distributions.map((distribution) => (
              <Card key={distribution.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {distribution.guest_name || 'Unknown Guest'}
                      </CardTitle>
                      <CardDescription>
                        {distribution.apartment?.apartment_number && 
                          `Apartment ${distribution.apartment.apartment_number}`
                        }
                        {distribution.prepared_by_staff && 
                          ` • Prepared by ${distribution.prepared_by_staff}`
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        distribution.status === 'delivered' ? 'default' :
                        distribution.status === 'prepared' ? 'secondary' :
                        distribution.status === 'declined' ? 'destructive' : 'outline'
                      }>
                        {distribution.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDistribution(distribution.id);
                          setShowDistributionModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDistribution(distribution.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-muted-foreground">
                        {new Date(distribution.distribution_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Configuration</p>
                      <p className="text-muted-foreground">
                        {distribution.configuration?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Total Cost</p>
                      <p className="text-muted-foreground">
                        R {distribution.total_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Items</p>
                      <p className="text-muted-foreground">
                        {distribution.items?.length || 0} items
                      </p>
                    </div>
                  </div>
                  {distribution.notes && (
                    <div className="mt-4">
                      <p className="font-medium text-sm">Notes:</p>
                      <p className="text-sm text-muted-foreground">{distribution.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {alert.alert_type === 'low_stock' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {alert.alert_type === 'out_of_stock' && <XCircle className="h-5 w-5 text-red-500" />}
                        {alert.alert_type === 'expiring_soon' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                        {alert.inventory_item?.name || 'Unknown Item'}
                      </CardTitle>
                      <CardDescription>{alert.message}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.is_resolved ? 'default' : 'destructive'}>
                        {alert.is_resolved ? 'Resolved' : 'Active'}
                      </Badge>
                      {!alert.is_resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Alert Type</p>
                      <p className="text-muted-foreground capitalize">
                        {alert.alert_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Current Stock</p>
                      <p className="text-muted-foreground">
                        {alert.current_stock || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Threshold</p>
                      <p className="text-muted-foreground">
                        {alert.threshold_value || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showConfigModal && (
        <WelcomePackConfigurationModal
          configurationId={editingConfig}
          onClose={() => {
            setShowConfigModal(false);
            setEditingConfig(null);
          }}
          onSave={() => {
            fetchConfigurations();
            setShowConfigModal(false);
            setEditingConfig(null);
          }}
        />
      )}

      {showDistributionModal && (
        <WelcomePackDistributionModal
          distributionId={editingDistribution}
          onClose={() => {
            setShowDistributionModal(false);
            setEditingDistribution(null);
          }}
          onSave={() => {
            fetchDistributions();
            setShowDistributionModal(false);
            setEditingDistribution(null);
          }}
        />
      )}

      {showReportsModal && (
        <WelcomePackReportsModal
          onClose={() => setShowReportsModal(false)}
        />
      )}
    </div>
  );
}
