import React, { useState, useEffect } from 'react';
import { adminApi } from '../../utils/api';
import { formatLocalDate, formatLocalDateShort } from '../../utils/dateUtils';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<number[]>([]);
  const [activeMessagesTab, setActiveMessagesTab] = useState<'visible' | 'hidden'>('visible');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApi.getAnalytics();
      setAnalytics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las analíticas');
    } finally {
      setLoading(false);
    }
  };

  // Initialize hidden ids from server data when analytics is loaded
  useEffect(() => {
    if (analytics && Array.isArray(analytics.messages)) {
      const serverHidden = analytics.messages
        .filter((m: any) => m.is_hidden === 1 || m.is_hidden === true)
        .map((m: any) => m.id);
      setHiddenMessageIds(serverHidden);
    }
  }, [analytics]);

  const hideMessage = async (id: number) => {
    try {
      await adminApi.hideMessage(id);
      setHiddenMessageIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } catch (e) {
      console.error('Error hiding message', e);
    }
  };

  const unhideMessage = async (id: number) => {
    try {
      await adminApi.unhideMessage(id);
      setHiddenMessageIds((prev) => prev.filter((hid) => hid !== id));
    } catch (e) {
      console.error('Error unhiding message', e);
    }
  };

  const unhideAllMessages = async () => {
    try {
      // Perform sequentially to keep API simple; small list sizes expected
      for (const id of hiddenMessageIds) {
        await adminApi.unhideMessage(id);
      }
      setHiddenMessageIds([]);
    } catch (e) {
      console.error('Error restoring all messages', e);
    }
  };

  const handleExportMessages = async () => {
    if (exporting) return;
    
    setExporting(true);
    try {
      const response = await adminApi.exportMessages();
      
      if (!response.ok) {
        throw new Error('Error al exportar los mensajes');
      }

      // Create a blob from the response and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mensajes_julietta_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message (you might want to add a toast system here)
      console.log('Mensajes exportados exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar los mensajes';
      console.error('Error exporting messages:', errorMessage);
      // You might want to show an error toast here
    } finally {
      setExporting(false);
    }
  };

  const formatDate = formatLocalDate;
  const formatShortDate = formatLocalDateShort;

  // Prepare chart data
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  const viewsLineData = (() => {
    const byDay = (analytics?.viewsByDay || []).slice().reverse();
    const labels = byDay.map((d: any) => formatShortDate(d.date));
    const data = byDay.map((d: any) => d.count);
    return {
      labels,
      datasets: [
        {
          label: 'Vistas',
          data,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  })();

  const confirmationsBarData = (() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return { dateStr, label: formatShortDate(dateStr) };
    });
    const rows: Array<{ date: string; action: string; count: number }> = analytics?.recentConfirmations || [];
    const cleanAction = (a: string) => (a || '').replaceAll('"', '');
    const confirmCounts = last7.map(({ dateStr }) =>
      rows
        .filter((r) => r.date === dateStr && cleanAction(r.action) === 'confirm')
        .reduce((sum, r) => sum + Number(r.count || 0), 0)
    );
    const unconfirmCounts = last7.map(({ dateStr }) =>
      rows
        .filter((r) => r.date === dateStr && cleanAction(r.action) === 'unconfirm')
        .reduce((sum, r) => sum + Number(r.count || 0), 0)
    );
    return {
      labels: last7.map((d) => d.label),
      datasets: [
        {
          label: 'Confirmaciones',
          data: confirmCounts,
          backgroundColor: 'rgba(34, 197, 94, 0.6)', // green-500
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
        {
          label: 'Cancelaciones',
          data: unconfirmCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.6)', // red-500
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
        },
      ],
    };
  })();

  const topInvitationsDoughnut = (() => {
    const items = (analytics?.topInvitations || []).slice(0, 6);
    const labels = items.map((inv: any) => `${inv.name} ${inv.lastname}`);
    const data = items.map((inv: any) => Number(inv.view_count || 0));
    const palette = [
      'rgba(147, 51, 234, 0.7)', // purple-600
      'rgba(59, 130, 246, 0.7)', // blue-500
      'rgba(34, 197, 94, 0.7)',  // green-500
      'rgba(234, 179, 8, 0.7)',  // yellow-500
      'rgba(249, 115, 22, 0.7)', // orange-500
      'rgba(236, 72, 153, 0.7)', // pink-500
    ];
    return {
      labels,
      datasets: [
        {
          label: 'Vistas',
          data,
          backgroundColor: palette.slice(0, data.length),
          borderColor: 'white',
          borderWidth: 2,
        },
      ],
    };
  })();

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={loadAnalytics}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">
          No hay datos de analíticas disponibles
        </div>
      </div>
    );
  }

  // Derived message lists
  const allMessages: any[] = analytics?.messages || [];
  const visibleMessages = allMessages.filter((m: any) => !hiddenMessageIds.includes(m.id));
  const hiddenMessages = allMessages.filter((m: any) => hiddenMessageIds.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Vistas</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalViews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Últimos 7 días</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.viewsLast7Days}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Últimos 30 días</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.viewsLast30Days}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Eventos RSVP</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.recentRsvpEvents?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Mensajes Recibidos</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.messages?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Invitations and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Invitations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invitaciones Más Vistas</h3>
          <div className="space-y-3">
            {analytics.topInvitations.length > 0 ? (
              analytics.topInvitations.map((invitation: any, index: number) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {invitation.name} {invitation.lastname}
                      </p>
                      <p className="text-xs text-gray-500">/{invitation.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{invitation.view_count}</p>
                    <p className="text-xs text-gray-500">vistas</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay datos de invitaciones</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {/* Combine views and confirmations */}
            {[...(analytics.recentViews || []), ...(analytics.recentRsvpEvents || [])]
              .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 10)
              .map((activity: any, index: number) => {
                const isConfirmation = activity.event_type && activity.event_type.startsWith('rsvp_');
                const isConfirm = activity.event_data && JSON.parse(activity.event_data).action === 'confirm';
                const isUnconfirm = activity.event_data && JSON.parse(activity.event_data).action === 'unconfirm';
                
                return (
                  <div
                    key={`${activity.id}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isConfirmation 
                          ? isConfirm 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                          : 'bg-blue-100'
                        }`}
                      >
                        {isConfirmation ? (
                          <svg className={`w-4 h-4 ${isConfirm ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isConfirm ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            )}
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {isConfirmation ? (
                            <span className="flex items-center gap-1">
                              {isConfirm ? (
                                <>
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Confirmó</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Canceló</span>
                                </>
                              )}
                              /{activity.slug}
                              <span className="text-xs text-gray-400 ml-2">
                                {activity.event_type === 'rsvp_button_click' && '(Click)'}
                                {activity.event_type === 'rsvp_action_success' && '(Éxito)'}
                                {activity.event_type === 'rsvp_action_error' && '(Error)'}
                                {activity.event_type === 'rsvp_action_exception' && '(Excepción)'}
                              </span>
                            </span>
                          ) : (
                            <span>
                              {activity.name} {activity.lastname}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                    {/* IP and User-Agent intentionally omitted for cleaner UI */}
                  </div>
                );
              })}
            {(!analytics.recentViews || analytics.recentViews.length === 0) && 
             (!analytics.confirmationEvents || analytics.confirmationEvents.length === 0) && (
              <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vistas por día - Línea */}
        {analytics.viewsByDay.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vistas por Día (Últimos 7 días)</h3>
            <div className="h-64">
              <Line data={viewsLineData} options={baseChartOptions} />
            </div>
          </div>
        )}

        {/* Confirmaciones - Barras apiladas */}
        {analytics.recentConfirmations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmaciones por Día (Últimos 7 días)</h3>
            <div className="h-64">
              <Bar
                data={confirmationsBarData}
                options={{
                  ...baseChartOptions,
                  scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Top invitaciones - Dona */}
        {analytics.topInvitations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Invitaciones por Vistas</h3>
            <div className="h-64">
              <Doughnut data={topInvitationsDoughnut} options={baseChartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Messages Section */}
      {analytics.messages && analytics.messages.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">Mensajes para Julietta</h3>
              <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setActiveMessagesTab('visible')}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    activeMessagesTab === 'visible'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Visibles ({visibleMessages.length})
                </button>
                <button
                  onClick={() => setActiveMessagesTab('hidden')}
                  className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 ${
                    activeMessagesTab === 'hidden'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Ocultos ({hiddenMessages.length})
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeMessagesTab === 'hidden' && (
                <button
                  onClick={unhideAllMessages}
                  disabled={hiddenMessages.length === 0}
                  className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-md ${
                    hiddenMessages.length === 0
                      ? 'bg-gray-300 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Restaurar todos
                </button>
              )}
              {activeMessagesTab === 'visible' && (
                <button
                  onClick={handleExportMessages}
                  disabled={exporting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Descargando...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar CSV
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {(activeMessagesTab === 'visible' ? visibleMessages : hiddenMessages).length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {activeMessagesTab === 'visible' ? 'No hay mensajes para mostrar' : 'No hay mensajes ocultos'}
              </p>
            )}

            {(activeMessagesTab === 'visible' ? visibleMessages : hiddenMessages).map((message: any, index: number) => {
              const messageData = message.event_data ? JSON.parse(message.event_data) : {};
              return (
                <div key={`${message.id}-${index}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {messageData.guest_name || 'Anónimo'}{message.invitation_slug ? ` · /${message.invitation_slug}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(message.timestamp)}</p>
                        </div>
                      </div>
                      <div className="ml-10">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {messageData.message || 'Mensaje no disponible'}
                        </p>
                      </div>
                    </div>
                    {activeMessagesTab === 'visible' ? (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Ocultar este mensaje? Podrás restaurarlo más tarde.')) {
                            hideMessage(message.id);
                          }
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        Ocultar
                      </button>
                    ) : (
                      <button
                        onClick={() => unhideMessage(message.id)}
                        className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden Messages Section removed; handled via tabs in Messages card */}
    </div>
  );
};

export default AnalyticsTab; 