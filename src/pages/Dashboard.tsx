import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload,
  History,
  FileText,
  BarChart3,
  TrendingUp,
  Database,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalUploads: number;
  totalEquipment: number;
  lastUploadDate: string | null;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUploads: 0,
    totalEquipment: 0,
    lastUploadDate: null,
  });
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch uploads count and recent uploads
      const { data: uploads, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (uploadsError) throw uploadsError;

      // Fetch total equipment count
      const { count: equipmentCount, error: equipmentError } = await supabase
        .from('equipment_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      if (equipmentError) throw equipmentError;

      setStats({
        totalUploads: uploads?.length || 0,
        totalEquipment: equipmentCount || 0,
        lastUploadDate: uploads?.[0]?.created_at || null,
      });

      setRecentUploads(uploads || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome')}, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">{t('dashboard.overview')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalUploads')}
            </CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUploads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalEquipment')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEquipment}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.lastUpload')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {stats.lastUploadDate
                ? format(new Date(stats.lastUploadDate), 'MMM dd, yyyy')
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6"
              onClick={() => navigate('/upload')}
            >
              <Upload className="h-8 w-8 text-primary" />
              <span>{t('dashboard.uploadNew')}</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6"
              onClick={() => navigate('/history')}
            >
              <History className="h-8 w-8 text-primary" />
              <span>{t('dashboard.viewHistory')}</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6"
              onClick={() => navigate('/visualization')}
            >
              <FileText className="h-8 w-8 text-primary" />
              <span>{t('dashboard.generateReport')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>
            {recentUploads.length > 0
              ? `${recentUploads.length} recent uploads`
              : t('dashboard.noData')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('dashboard.noData')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('dashboard.getStarted')}</p>
              <Button className="mt-4" onClick={() => navigate('/upload')}>
                <Upload className="mr-2 h-4 w-4" />
                {t('dashboard.uploadNew')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{upload.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {upload.record_count} {t('history.records')} •{' '}
                        {format(new Date(upload.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/visualization', { state: { uploadId: upload.id } })}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
