'use client';

import { useState } from 'react';
import { useWelcomePack } from '@/hooks/useWelcomePack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BarChart3, Download, TrendingUp, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { WelcomePackConsumptionReport, WelcomePackCostAnalysis } from '@/lib/types';

interface WelcomePackReportsModalProps {
  onClose: () => void;
}

export function WelcomePackReportsModal({ onClose }: WelcomePackReportsModalProps) {
  const { configurations, getConsumptionReport, getCostAnalysis } = useWelcomePack();

  const [reportType, setReportType] = useState<'consumption' | 'cost-analysis'>('consumption');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedConfiguration, setSelectedConfiguration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [consumptionReport, setConsumptionReport] = useState<WelcomePackConsumptionReport | null>(null);
  const [costAnalysis, setCostAnalysis] = useState<WelcomePackCostAnalysis | null>(null);

  // Set default date range (last 30 days)
  useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  });

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (reportType === 'cost-analysis' && !selectedConfiguration) {
      toast.error('Please select a configuration for cost analysis');
      return;
    }

    setIsLoading(true);

    try {
      if (reportType === 'consumption') {
        const report = await getConsumptionReport(startDate, endDate);
        setConsumptionReport(report);
        setCostAnalysis(null);
      } else {
        const analysis = await getCostAnalysis(selectedConfiguration);
        setCostAnalysis(analysis);
        setConsumptionReport(null);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (reportType === 'consumption' && consumptionReport) {
      const csvContent = [
        ['Item Name', 'Quantity Issued', 'Total Cost'],
        ...consumptionReport.items_consumed.map(item => [
          item.item_name,
          item.quantity_issued.toString(),
          item.total_cost.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `welcome-pack-consumption-${startDate}-to-${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (reportType === 'cost-analysis' && costAnalysis) {
      const csvContent = [
        ['Item Name', 'Quantity', 'Unit Cost', 'Total Cost'],
        ...costAnalysis.item_breakdown.map(item => [
          item.item_name,
          item.quantity.toString(),
          item.unit_cost.toFixed(2),
          item.total_cost.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `welcome-pack-cost-analysis-${costAnalysis.configuration_name}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Welcome Pack Reports
          </DialogTitle>
          <DialogDescription>
            Generate consumption and cost analysis reports for welcome packs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value: string) => setReportType(value as "consumption" | "cost-analysis")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumption">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Consumption Report
                    </div>
                  </SelectItem>
                  <SelectItem value="cost-analysis">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Cost Analysis
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {reportType === 'cost-analysis' && (
              <div>
                <Label htmlFor="configuration">Configuration *</Label>
                <Select value={selectedConfiguration} onValueChange={setSelectedConfiguration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {configurations.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={generateReport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
              {(consumptionReport || costAnalysis) && (
                <Button onClick={exportReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>

          {/* Consumption Report Results */}
          {consumptionReport && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Consumption Report
                  </CardTitle>
                  <CardDescription>
                    Period: {consumptionReport.period}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{consumptionReport.total_distributions}</div>
                      <div className="text-sm text-muted-foreground">Total Distributions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">R {consumptionReport.total_cost.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{consumptionReport.items_consumed.length}</div>
                      <div className="text-sm text-muted-foreground">Unique Items</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Items Consumed</h4>
                    <div className="space-y-2">
                      {consumptionReport.items_consumed.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {item.quantity_issued}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R {item.total_cost.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              R {(item.total_cost / item.quantity_issued).toFixed(2)} per unit
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cost Analysis Results */}
          {costAnalysis && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Cost Analysis
                  </CardTitle>
                  <CardDescription>
                    Configuration: {costAnalysis.configuration_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold">R {costAnalysis.total_cost.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Cost per Welcome Pack</div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Item Breakdown</h4>
                    <div className="space-y-2">
                      {costAnalysis.item_breakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} × R {item.unit_cost.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R {item.total_cost.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              {((item.total_cost / costAnalysis.total_cost) * 100).toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Results */}
          {!consumptionReport && !costAnalysis && !isLoading && (
            <Alert>
              <AlertDescription>
                Select a report type, date range, and click &quot;Generate Report&quot; to view results.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
