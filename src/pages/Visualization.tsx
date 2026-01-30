import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2, Database } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Scatter } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

interface EquipmentData {
  equipment_name: string;
  equipment_type: string;
  flowrate: number | null;
  pressure: number | null;
  temperature: number | null;
}

interface Upload {
  id: string;
  filename: string;
  record_count: number;
  summary: any;
  created_at: string;
}

export default function Visualization() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(location.state?.uploadId || null);
  const [data, setData] = useState<EquipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (user) fetchUploads();
  }, [user]);

  useEffect(() => {
    if (selectedUpload) fetchData(selectedUpload);
  }, [selectedUpload]);

  const fetchUploads = async () => {
    const { data: uploadsData } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setUploads(uploadsData || []);
    if (!selectedUpload && uploadsData?.[0]) {
      setSelectedUpload(uploadsData[0].id);
    }
    setLoading(false);
  };

  const fetchData = async (uploadId: string) => {
    const { data: equipmentData } = await supabase
      .from('equipment_data')
      .select('*')
      .eq('upload_id', uploadId);
    setData(equipmentData || []);
  };

  const currentUpload = uploads.find((u) => u.id === selectedUpload);
  const summary = currentUpload?.summary;

  const typeData = summary?.typeDistribution ? {
    labels: Object.keys(summary.typeDistribution),
    datasets: [{
      data: Object.values(summary.typeDistribution),
      backgroundColor: ['hsl(153, 100%, 17%)', 'hsl(153, 80%, 30%)', 'hsl(153, 60%, 45%)', 'hsl(153, 40%, 60%)', 'hsl(153, 30%, 75%)'],
    }],
  } : null;

  const scatterData = data.length > 0 ? {
    datasets: [{
      label: `${t('table.pressure')} vs ${t('table.flowrate')}`,
      data: data.filter(d => d.pressure && d.flowrate).map(d => ({ x: d.flowrate!, y: d.pressure! })),
      backgroundColor: 'hsl(153, 100%, 17%)',
    }],
  } : null;

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Chemical Equipment Report', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`File: ${currentUpload?.filename}`, 20, 38);
      
      doc.setFontSize(14);
      doc.text('Summary Statistics', 20, 52);
      doc.setFontSize(10);
      doc.text(`Total Equipment: ${data.length}`, 20, 62);
      doc.text(`Avg Flowrate: ${summary?.avgFlowrate?.toFixed(2) || '-'}`, 20, 70);
      doc.text(`Avg Pressure: ${summary?.avgPressure?.toFixed(2) || '-'}`, 20, 78);
      doc.text(`Avg Temperature: ${summary?.avgTemperature?.toFixed(2) || '-'}`, 20, 86);

      autoTable(doc, {
        startY: 100,
        head: [['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']],
        body: data.slice(0, 50).map(d => [d.equipment_name, d.equipment_type, d.flowrate?.toFixed(2) || '-', d.pressure?.toFixed(2) || '-', d.temperature?.toFixed(2) || '-']),
      });

      doc.save(`equipment-report-${Date.now()}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
    setGeneratingPdf(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Database className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">{t('visualization.noDataSelected')}</h2>
        <p className="text-muted-foreground mt-2">{t('visualization.selectDataset')}</p>
        <Button className="mt-4" onClick={() => navigate('/upload')}>{t('dashboard.uploadNew')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('visualization.title')}</h1>
          <p className="text-muted-foreground">{t('visualization.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedUpload || ''} onValueChange={setSelectedUpload}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select dataset" /></SelectTrigger>
            <SelectContent>
              {uploads.map((u) => (<SelectItem key={u.id} value={u.id}>{u.filename}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button onClick={generatePdf} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">{t('visualization.generatePdf')}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('visualization.totalCount')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('visualization.avgFlowrate')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary?.avgFlowrate?.toFixed(2) || '-'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('visualization.avgPressure')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary?.avgPressure?.toFixed(2) || '-'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('visualization.avgTemperature')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary?.avgTemperature?.toFixed(2) || '-'}</p></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {typeData && (
          <Card><CardHeader><CardTitle>{t('visualization.typeDistribution')}</CardTitle></CardHeader><CardContent className="h-[300px] flex items-center justify-center"><Pie data={typeData} options={{ maintainAspectRatio: false }} /></CardContent></Card>
        )}
        {scatterData && (
          <Card><CardHeader><CardTitle>{t('visualization.pressureFlowrate')}</CardTitle></CardHeader><CardContent className="h-[300px]"><Scatter data={scatterData} options={{ maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Flowrate' } }, y: { title: { display: true, text: 'Pressure' } } } }} /></CardContent></Card>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader><CardTitle>{t('visualization.dataTable')}</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto max-h-96">
            <Table>
              <TableHeader><TableRow><TableHead>{t('table.equipmentName')}</TableHead><TableHead>{t('table.type')}</TableHead><TableHead className="text-right">{t('table.flowrate')}</TableHead><TableHead className="text-right">{t('table.pressure')}</TableHead><TableHead className="text-right">{t('table.temperature')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.slice(0, 20).map((row, i) => (<TableRow key={i}><TableCell>{row.equipment_name}</TableCell><TableCell>{row.equipment_type}</TableCell><TableCell className="text-right">{row.flowrate?.toFixed(2) ?? '-'}</TableCell><TableCell className="text-right">{row.pressure?.toFixed(2) ?? '-'}</TableCell><TableCell className="text-right">{row.temperature?.toFixed(2) ?? '-'}</TableCell></TableRow>))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
