import React, { useState, useEffect } from 'react';
import { formatLocalDate } from '../../utils/dateUtils';
import AdminHeader from './AdminHeader';

interface RecentActivityPageProps {
  page?: string;
  limit?: string;
  eventType?: string;
  invite?: string;
}

interface Activity {
  id: number;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  event_type: string;
  event_data: string | null;
  name: string | null;
  lastname: string | null;
  slug: string | null;
  secondary_name: string | null;
  secondary_lastname: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const RecentActivityPage: React.FC<RecentActivityPageProps> = ({ 
  page: initialPage = '1', 
  limit: initialLimit = '50',
  eventType: initialEventType = '',
  invite: initialInvite = ''
}) => {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: parseInt(initialPage),
    limit: parseInt(initialLimit),
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    eventType: initialEventType,
    invite: initialInvite
  });
  const [filterOptions, setFilterOptions] = useState({
    eventTypes: [] as string[],
    invites: [] as Array<{ slug: string; name: string; coupleName?: string | null }>
  });
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [pagination.page, pagination.limit, filters.eventType, filters.invite]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const response = await fetch('/api/analytics/filter-options');
      console.log('Filter options response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Filter options result:', result);
        if (result.success) {
          setFilterOptions(result.data);
        }
      } else {
        console.error('Filter options response not ok:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.eventType) {
        params.append('eventType', filters.eventType);
      }
      if (filters.invite) {
        params.append('invite', filters.invite);
      }

      const response = await fetch(`/api/analytics/recent-activity?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }

      const result = await response.json();
      
      if (result.success) {
        setActivity(result.data.activity);
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages
        }));
      } else {
        throw new Error(result.error || 'Error al cargar los datos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url.toString());
  };

  const handleFilterChange = (filterType: 'eventType' | 'invite', value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filters change
    
    // Update URL
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(filterType, value);
    } else {
      url.searchParams.delete(filterType);
    }
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url.toString());
  };

  const clearFilters = () => {
    setFilters({ eventType: '', invite: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('eventType');
    url.searchParams.delete('invite');
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url.toString());
  };

  // Helper function to get event type display info
  const getEventInfo = (eventType: string, eventData: string | null) => {
    const isConfirmation = eventType && eventType.startsWith('rsvp_');
    let action = '';
    let icon = '';
    let color = '';
    
    if (isConfirmation) {
      try {
        const data = eventData ? JSON.parse(eventData) : {};
        const isConfirm = data.action === 'confirm';
        const isUnconfirm = data.action === 'unconfirm';
        
        if (isConfirm) {
          action = 'Confirmó';
          icon = 'check';
          color = 'green';
        } else if (isUnconfirm) {
          action = 'Canceló';
          icon = 'x';
          color = 'red';
        } else {
          action = 'RSVP';
          icon = 'calendar';
          color = 'blue';
        }
      } catch (e) {
        action = 'RSVP';
        icon = 'calendar';
        color = 'blue';
      }
    } else {
      action = 'Vista';
      icon = 'eye';
      color = 'blue';
    }
    
    return { action, icon, color, isConfirmation };
  };

  // Helper function to translate event types for filter dropdown
  const translateEventType = (eventType: string) => {
    switch (eventType) {
      case 'view':
        return 'Vista de invitación';
      case 'rsvp_button_click':
        return 'Clic en botón RSVP';
      case 'rsvp_action_success':
        return 'Cambio de RSVP';
      case 'rsvp_action_error':
        return 'Error en RSVP';
      case 'rsvp_action_exception':
        return 'Excepción en RSVP';
      default:
        return eventType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando actividad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadData}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Intentar de Nuevo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminHeader title="Actividad Reciente" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lista de Actividades</h2>
              <p className="mt-2 text-sm text-gray-600">
                Lista completa de todas las actividades recientes (vistas y RSVP)
              </p>
            </div>
          </div>
                        </div>

        <div className="space-y-6">
        {/* Stats Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              <p className="text-sm text-gray-600">Total de Actividades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {activity.filter(a => a.event_type === 'view').length}
              </p>
              <p className="text-sm text-gray-600">Vistas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {activity.filter(a => {
                  try {
                    const data = a.event_data ? JSON.parse(a.event_data) : {};
                    return data.action === 'confirm';
                  } catch (e) {
                    return false;
                  }
                }).length}
              </p>
              <p className="text-sm text-gray-600">Confirmaciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {activity.filter(a => {
                  try {
                    const data = a.event_data ? JSON.parse(a.event_data) : {};
                    return data.action === 'unconfirm';
                  } catch (e) {
                    return false;
                  }
                }).length}
              </p>
              <p className="text-sm text-gray-600">Cancelaciones</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-end w-full justify-end gap-4">
          {/* Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-1">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                  Tipo de Evento
                </label>
                <select
                  value={filters.eventType}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={loadingFilters}
                >
                  <option value="">
                    {loadingFilters ? 'Cargando...' : 'Todos los tipos'}
                  </option>
                  {filterOptions.eventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {translateEventType(eventType)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Invitado
                </label>
                <select
                  value={filters.invite}
                  onChange={(e) => handleFilterChange('invite', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={loadingFilters}
                >
                  <option value="">
                    {loadingFilters ? 'Cargando...' : 'Todos los invitados'}
                  </option>
                  {filterOptions.invites.map((invite) => (
                    <option key={invite.slug} value={invite.slug}>
                      {invite.name}
                      {invite.coupleName && `\n${invite.coupleName}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center gap-2"
                disabled={loadingFilters}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar Filtros
              </button>
            </div>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 shadow-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex-shrink-0"
            title={showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Activity List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Lista de Actividades</h3>
          </div>
          
          {activity.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay actividad</h3>
              <p className="mt-1 text-sm text-gray-500">No se encontraron actividades recientes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitado
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activity.map((item) => {
                    const eventInfo = getEventInfo(item.event_type, item.event_data);
                    const colorClasses = {
                      green: 'bg-green-100 text-green-600',
                      red: 'bg-red-100 text-red-600',
                      blue: 'bg-blue-100 text-blue-600'
                    };
                    
                    const iconComponents = {
                      check: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ),
                      x: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ),
                      eye: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ),
                      calendar: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )
                    };
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[eventInfo.color as keyof typeof colorClasses]}`}>
                              {iconComponents[eventInfo.icon as keyof typeof iconComponents]}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{eventInfo.action}</div>
                              <div className="text-xs text-gray-500">{formatLocalDate(item.timestamp)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.name} {item.lastname}
                            {item.secondary_name && (
                              <div className="text-gray-500 text-xs">
                                {item.secondary_name} {item.secondary_lastname ? `/ ${item.secondary_lastname}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500">/{item.slug}</div>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">/{item.slug}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              {pagination.page > 1 && (
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
              )}
              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Siguiente
                </button>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
                  <span className="font-medium">{pagination.total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {pagination.page > 1 && (
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {pagination.page < pagination.totalPages && (
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </main>
  );
};

export default RecentActivityPage;
