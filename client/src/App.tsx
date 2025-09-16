import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { Upload, AlertCircle, TrendingUp, Users, Factory, AlertTriangle, Grid, List, RefreshCw } from 'lucide-react';
import { LineChart } from '@/components/LineChart';
import { StaffCard } from '@/components/StaffCard';
import { NotificationBanner } from '@/components/NotificationBanner';

// Using type-only imports for better TypeScript compliance
import type { KpiData, StaffMember, CreateStaffMemberInput, CsvUploadInput } from '../../server/src/schema';

function App() {
  // KPI Data State
  const [kpiData, setKpiData] = useState<KpiData[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingKpi, setIsLoadingKpi] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvType, setCsvType] = useState<'kpi' | 'staff'>('kpi');
  const [isUploading, setIsUploading] = useState(false);

  // Staff Form State
  const [staffFormData, setStaffFormData] = useState<CreateStaffMemberInput>({
    name: '',
    position: '',
    department: '',
    status: 'active'
  });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [staffViewMode, setStaffViewMode] = useState<'table' | 'cards'>('table');

  // Load KPI Data
  const loadKpiData = useCallback(async () => {
    setIsLoadingKpi(true);
    try {
      const result = await trpc.getKpiData.query();
      setKpiData(result);
    } catch (error) {
      console.error('Failed to load KPI data:', error);
      setKpiData([]);
    } finally {
      setIsLoadingKpi(false);
    }
  }, []);

  // Load Staff Members
  const loadStaffMembers = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const result = await trpc.getStaffMembers.query();
      setStaffMembers(result);
    } catch (error) {
      console.error('Failed to load staff members:', error);
      setStaffMembers([]);
    } finally {
      setIsLoadingStaff(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadKpiData();
    loadStaffMembers();
  }, [loadKpiData, loadStaffMembers]);

  // Handle CSV Upload
  const handleCsvUpload = async () => {
    if (!csvFile) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const csvContent = await csvFile.text();
      const uploadData: CsvUploadInput = {
        type: csvType,
        data: csvContent
      };

      await trpc.uploadCsv.mutate(uploadData);
      setUploadStatus({ type: 'success', message: `${csvType.toUpperCase()} data uploaded successfully!` });
      
      // Reload data after successful upload
      if (csvType === 'kpi') {
        await loadKpiData();
      } else {
        await loadStaffMembers();
      }

      setCsvFile(null);
    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadStatus({ type: 'error', message: 'Failed to upload CSV. Please check the format and try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Staff Creation
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStaff(true);

    try {
      const newMember = await trpc.createStaffMember.mutate(staffFormData);
      setStaffMembers((prev: StaffMember[]) => [...prev, newMember]);
      setStaffFormData({
        name: '',
        position: '',
        department: '',
        status: 'active'
      });
      setUploadStatus({ type: 'success', message: 'Staff member created successfully!' });
    } catch (error) {
      console.error('Failed to create staff member:', error);
      setUploadStatus({ type: 'error', message: 'Failed to create staff member.' });
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Format data for charts
  const efficiencyData = kpiData.map((item: KpiData) => ({
    week: new Date(item.week_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: item.efficiency
  }));

  const productionRateData = kpiData.map((item: KpiData) => ({
    week: new Date(item.week_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: item.production_rate
  }));

  const defectsData = kpiData.map((item: KpiData) => ({
    week: new Date(item.week_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: item.defects_ppm
  }));

  // Calculate summary metrics
  const avgEfficiency = kpiData.length > 0 ? 
    kpiData.reduce((sum, item) => sum + item.efficiency, 0) / kpiData.length : 0;
  const avgProductionRate = kpiData.length > 0 ? 
    kpiData.reduce((sum, item) => sum + item.production_rate, 0) / kpiData.length : 0;
  const avgDefectsPpm = kpiData.length > 0 ? 
    kpiData.reduce((sum, item) => sum + item.defects_ppm, 0) / kpiData.length : 0;

  const activeStaffCount = staffMembers.filter((member: StaffMember) => member.status === 'active').length;
  const vacationStaffCount = staffMembers.filter((member: StaffMember) => member.status === 'on_vacation').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-3">
              <Factory className="h-8 w-8 text-blue-600" />
              Production Dashboard
            </h1>
            <p className="text-slate-600 mt-2">Monitor KPIs and manage production staff</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadKpiData();
              loadStaffMembers();
            }}
            disabled={isLoadingKpi || isLoadingStaff}
            className="flex items-center gap-2 self-start"
          >
            <RefreshCw className={`h-4 w-4 ${(isLoadingKpi || isLoadingStaff) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Status Alert */}
        {uploadStatus.type && (
          <NotificationBanner
            type={uploadStatus.type}
            message={uploadStatus.message}
            onDismiss={() => setUploadStatus({ type: null, message: '' })}
          />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{avgEfficiency.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Production Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{avgProductionRate.toFixed(1)}/hr</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Defects PPM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{avgDefectsPpm.toFixed(0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeStaffCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">On Vacation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{vacationStaffCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="kpis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="kpis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              KPI Analytics
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Management
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Data Upload
            </TabsTrigger>
          </TabsList>

          {/* KPI Analytics Tab */}
          <TabsContent value="kpis" className="space-y-6">
            {isLoadingKpi ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-slate-500">Loading KPI data...</div>
                </CardContent>
              </Card>
            ) : kpiData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-slate-600 font-medium">No KPI data available</p>
                    <p className="text-sm text-slate-500">Upload a CSV file in the Data Upload tab to get started</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Efficiency Chart */}
                <LineChart
                  data={efficiencyData}
                  dataKey="efficiency"
                  color="#3b82f6"
                  title="Weekly Efficiency Trend"
                  unit="%"
                  yAxisMin={0}
                  yAxisMax={100}
                />

                {/* Production Rate Chart */}
                <LineChart
                  data={productionRateData}
                  dataKey="production_rate"
                  color="#10b981"
                  title="Weekly Production Rate"
                  unit=" units/hr"
                />

                {/* Defects PPM Chart */}
                <LineChart
                  data={defectsData}
                  dataKey="defects_ppm"
                  color="#f59e0b"
                  title="Weekly Defects (PPM)"
                  unit=" PPM"
                  yAxisMin={0}
                />
              </div>
            )}
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-6">
            {/* Add Staff Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Staff Member</CardTitle>
                <CardDescription>Create a new production staff member record</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStaffSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={staffFormData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setStaffFormData((prev: CreateStaffMemberInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Staff member name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={staffFormData.position}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setStaffFormData((prev: CreateStaffMemberInput) => ({ ...prev, position: e.target.value }))
                      }
                      placeholder="Job position"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={staffFormData.department}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setStaffFormData((prev: CreateStaffMemberInput) => ({ ...prev, department: e.target.value }))
                      }
                      placeholder="Department"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={staffFormData.status || 'active'}
                      onValueChange={(value: 'active' | 'on_vacation') =>
                        setStaffFormData((prev: CreateStaffMemberInput) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_vacation">On Vacation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isCreatingStaff} className="w-full">
                      {isCreatingStaff ? 'Adding...' : 'Add Staff'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Staff List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Production Staff ({staffMembers.length})</CardTitle>
                  <CardDescription>All production staff members and their current status</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={staffViewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStaffViewMode('table')}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Table
                  </Button>
                  <Button
                    variant={staffViewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStaffViewMode('cards')}
                    className="flex items-center gap-2"
                  >
                    <Grid className="h-4 w-4" />
                    Cards
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="text-center py-8 text-slate-500">Loading staff members...</div>
                ) : staffMembers.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <Users className="h-12 w-12 text-slate-400 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-slate-600 font-medium">No staff members found</p>
                      <p className="text-sm text-slate-500">Add staff members using the form above or upload a CSV file</p>
                    </div>
                  </div>
                ) : staffViewMode === 'table' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMembers.map((member: StaffMember) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.position}</TableCell>
                          <TableCell>{member.department}</TableCell>
                          <TableCell>
                            <Badge
                              variant={member.status === 'active' ? 'default' : 'secondary'}
                              className={member.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}
                            >
                              {member.status === 'active' ? '✅ Active' : '🏖️ On Vacation'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {new Date(member.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffMembers.map((member: StaffMember) => (
                      <StaffCard key={member.id} member={member} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CSV Data Upload</CardTitle>
                <CardDescription>Upload KPI data or staff information via CSV files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="csv-type">Data Type</Label>
                    <Select value={csvType} onValueChange={(value: 'kpi' | 'staff') => setCsvType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kpi">KPI Data</SelectItem>
                        <SelectItem value="staff">Staff Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCsvFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                  <Button
                    onClick={handleCsvUpload}
                    disabled={!csvFile || isUploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload CSV'}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">CSV Format Requirements:</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className={`p-4 transition-all ${csvType === 'kpi' ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        📊 KPI Data CSV Format:
                      </h5>
                      <div className="text-xs font-mono bg-slate-100 p-3 rounded border">
                        <div className="font-semibold text-slate-700">week_date,efficiency,production_rate,defects_ppm</div>
                        <div className="text-slate-600">2024-01-01,85.5,150.2,45</div>
                        <div className="text-slate-600">2024-01-08,87.3,155.8,42</div>
                        <div className="text-slate-600">2024-01-15,89.1,148.9,38</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <div>• <strong>week_date:</strong> YYYY-MM-DD format</div>
                        <div>• <strong>efficiency:</strong> 0-100 (percentage)</div>
                        <div>• <strong>production_rate:</strong> units per hour</div>
                        <div>• <strong>defects_ppm:</strong> defects per million parts</div>
                      </div>
                    </Card>
                    
                    <Card className={`p-4 transition-all ${csvType === 'staff' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        👥 Staff Data CSV Format:
                      </h5>
                      <div className="text-xs font-mono bg-slate-100 p-3 rounded border">
                        <div className="font-semibold text-slate-700">name,position,department,status</div>
                        <div className="text-slate-600">John Smith,Operator,Production,active</div>
                        <div className="text-slate-600">Jane Doe,Supervisor,Quality,on_vacation</div>
                        <div className="text-slate-600">Mike Johnson,Technician,Maintenance,active</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <div>• <strong>name:</strong> Full name of staff member</div>
                        <div>• <strong>position:</strong> Job title/role</div>
                        <div>• <strong>department:</strong> Work department</div>
                        <div>• <strong>status:</strong> 'active' or 'on_vacation'</div>
                      </div>
                    </Card>
                  </div>
                  
                  {csvFile && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700">
                        Ready to upload <strong>{csvFile.name}</strong> as <strong>{csvType.toUpperCase()}</strong> data.
                        File size: {(csvFile.size / 1024).toFixed(2)} KB
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;