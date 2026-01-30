import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Trash2, BarChart3, Loader2, Database } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchUploads(); }, [user]);

  const fetchUploads = async () => {
    const { data } = await supabase.from('uploads').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setUploads(data || []);
    setLoading(false);
  };

  const deleteUpload = async (id: string) => {
    await supabase.from('uploads').delete().eq('id', id);
    toast.success(t('history.deleteSuccess'));
    fetchUploads();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-3xl font-bold">{t('history.title')}</h1><p className="text-muted-foreground">{t('history.subtitle')}</p></div>
      <Card>
        <CardHeader><CardTitle>{t('history.title')}</CardTitle><CardDescription>{t('history.keepLast5')}</CardDescription></CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="flex flex-col items-center py-12"><Database className="h-12 w-12 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('history.noHistory')}</p><Button className="mt-4" onClick={() => navigate('/upload')}>{t('dashboard.uploadNew')}</Button></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>{t('history.filename')}</TableHead><TableHead>{t('history.uploadDate')}</TableHead><TableHead className="text-right">{t('history.records')}</TableHead><TableHead className="text-right">{t('history.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{upload.filename}</TableCell>
                    <TableCell>{format(new Date(upload.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className="text-right">{upload.record_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate('/visualization', { state: { uploadId: upload.id } })}><BarChart3 className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle><AlertDialogDescription>{t('history.deleteConfirm')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteUpload(upload.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
