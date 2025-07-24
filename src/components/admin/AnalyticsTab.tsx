import React, { useState, useEffect } from 'react';
import { adminApi } from '../../utils/api';

const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    });
  };

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
                  <div key={`${activity.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isConfirmation 
                          ? isConfirm 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                          : 'bg-blue-100'
                      }`}>
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
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        IP: {activity.ip_address}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.user_agent ? activity.user_agent.substring(0, 30) + '...' : 'N/A'}
                      </p>
                    </div>
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
        {/* Views by Day Chart */}
        {analytics.viewsByDay.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vistas por Día (Últimos 7 días)</h3>
            <div className="grid grid-cols-7 gap-2">
              {analytics.viewsByDay.map((day: any) => (
                <div key={day.date} className="text-center">
                  <div className="bg-purple-100 rounded-lg p-2 mb-1">
                    <p className="text-lg font-semibold text-purple-600">{day.count}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatShortDate(day.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmations by Day Chart */}
        {analytics.recentConfirmations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmaciones por Día (Últimos 7 días)</h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const confirmations = analytics.recentConfirmations.filter((c: any) => 
                  c.date === dateStr && c.action === 'confirm'
                );
                const unconfirmations = analytics.recentConfirmations.filter((c: any) => 
                  c.date === dateStr && c.action === 'unconfirm'
                );
                
                const confirmCount = confirmations.reduce((sum: number, c: any) => sum + c.count, 0);
                const unconfirmCount = unconfirmations.reduce((sum: number, c: any) => sum + c.count, 0);
                
                return (
                  <div key={dateStr} className="text-center">
                    <div className="space-y-1">
                      {confirmCount > 0 && (
                        <div className="bg-green-100 rounded p-1">
                          <p className="text-sm font-semibold text-green-600">+{confirmCount}</p>
                        </div>
                      )}
                      {unconfirmCount > 0 && (
                        <div className="bg-red-100 rounded p-1">
                          <p className="text-sm font-semibold text-red-600">-{unconfirmCount}</p>
                        </div>
                      )}
                      {(confirmCount === 0 && unconfirmCount === 0) && (
                        <div className="bg-gray-100 rounded p-1">
                          <p className="text-sm font-semibold text-gray-400">0</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatShortDate(dateStr)}</p>
                  </div>
                );
              }).reverse()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab; 