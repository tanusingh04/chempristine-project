import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload as UploadIcon, FileUp, Check, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

interface ParsedRow {
  equipment_name: string;
  equipment_type: string;
  flowrate: number | null;
  pressure: number | null;
  temperature: number | null;
}

export default function Upload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (file: File) => {
    setParsing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as Record<string, string>[];
          
          // Map CSV columns to our format (flexible column naming)
          const mapped: ParsedRow[] = data.map((row) => {
            const keys = Object.keys(row);
            
            // Find columns by partial match
            const findColumn = (patterns: string[]) => {
              return keys.find((k) => 
                patterns.some((p) => k.toLowerCase().includes(p.toLowerCase()))
              );
            };

            const nameCol = findColumn(['equipment name', 'name', 'equipment']);
            const typeCol = findColumn(['type', 'equipment type']);
            const flowCol = findColumn(['flowrate', 'flow rate', 'flow']);
            const pressCol = findColumn(['pressure', 'press']);
            const tempCol = findColumn(['temperature', 'temp']);

            return {
              equipment_name: nameCol ? row[nameCol]?.trim() || 'Unknown' : 'Unknown',
              equipment_type: typeCol ? row[typeCol]?.trim() || 'Unknown' : 'Unknown',
              flowrate: flowCol ? parseFloat(row[flowCol]) || null : null,
              pressure: pressCol ? parseFloat(row[pressCol]) || null : null,
              temperature: tempCol ? parseFloat(row[tempCol]) || null : null,
            };
          }).filter((row) => row.equipment_name !== 'Unknown' || row.equipment_type !== 'Unknown');

          if (mapped.length === 0) {
            setError(t('upload.invalidFormat'));
            setParsedData([]);
          } else {
            setParsedData(mapped);
          }
        } catch (err) {
          setError(t('upload.invalidFormat'));
          setParsedData([]);
        }
        setParsing(false);
      },
      error: () => {
        setError(t('upload.invalidFormat'));
        setParsing(false);
      },
    });
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError(t('upload.invalidFormat'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('upload.fileTooLarge'));
      return;
    }
    setFile(file);
    parseCSV(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!user || !file || parsedData.length === 0) return;

    setUploading(true);

    try {
      // Calculate summary statistics
      const flowrates = parsedData.filter((d) => d.flowrate !== null).map((d) => d.flowrate!);
      const pressures = parsedData.filter((d) => d.pressure !== null).map((d) => d.pressure!);
      const temperatures = parsedData.filter((d) => d.temperature !== null).map((d) => d.temperature!);

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const typeDistribution: Record<string, number> = {};
      parsedData.forEach((d) => {
        typeDistribution[d.equipment_type] = (typeDistribution[d.equipment_type] || 0) + 1;
      });

      const summary = {
        avgFlowrate: avg(flowrates),
        avgPressure: avg(pressures),
        avgTemperature: avg(temperatures),
        typeDistribution,
      };

      // Delete old uploads if more than 5
      const { data: existingUploads } = await supabase
        .from('uploads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (existingUploads && existingUploads.length >= 5) {
        const toDelete = existingUploads.slice(4).map((u) => u.id);
        await supabase.from('uploads').delete().in('id', toDelete);
      }

      // Create upload record
      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          filename: file.name,
          record_count: parsedData.length,
          summary,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Insert equipment data
      const equipmentRecords = parsedData.map((row) => ({
        upload_id: uploadData.id,
        user_id: user.id,
        equipment_name: row.equipment_name,
        equipment_type: row.equipment_type,
        flowrate: row.flowrate,
        pressure: row.pressure,
        temperature: row.temperature,
      }));

      const { error: dataError } = await supabase
        .from('equipment_data')
        .insert(equipmentRecords);

      if (dataError) throw dataError;

      toast.success(t('upload.success'));
      navigate('/visualization', { state: { uploadId: uploadData.id } });
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('upload.error'));
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">{t('upload.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('upload.subtitle')}</p>
      </div>

      {/* Upload Zone */}
      {!file && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`drop-zone flex flex-col items-center justify-center gap-4 p-12 text-center transition-all ${
                isDragging ? 'active' : ''
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileUp className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">{t('upload.dragDrop')}</p>
                <p className="text-muted-foreground">{t('upload.or')}</p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    {t('upload.browse')}
                  </span>
                </Button>
              </label>
              <div className="text-sm text-muted-foreground">
                <p>{t('upload.supportedFormats')}</p>
                <p>{t('upload.maxSize')}</p>
                <p className="mt-2 text-xs">{t('upload.expectedColumns')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={resetUpload} className="ml-auto">
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {parsing && (
        <Card>
          <CardContent className="flex items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">{t('upload.processing')}</p>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {parsedData.length > 0 && !parsing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  {t('upload.preview')}
                </CardTitle>
                <CardDescription>
                  {parsedData.length} {t('upload.recordsFound')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetUpload}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      {t('upload.confirmUpload')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.equipmentName')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead className="text-right">{t('table.flowrate')}</TableHead>
                    <TableHead className="text-right">{t('table.pressure')}</TableHead>
                    <TableHead className="text-right">{t('table.temperature')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.equipment_name}</TableCell>
                      <TableCell>{row.equipment_type}</TableCell>
                      <TableCell className="text-right">
                        {row.flowrate?.toFixed(2) ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.pressure?.toFixed(2) ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.temperature?.toFixed(2) ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 10 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t('table.showing')} 10 {t('table.of')} {parsedData.length} {t('table.entries')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
