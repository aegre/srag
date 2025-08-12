import React, { useState, useEffect } from 'react';
import { adminApi } from '../../utils/api';
import { formatLocalDate } from '../../utils/dateUtils';
import AdminHeader from './AdminHeader';

interface TopInvitationsPageProps {
  page?: string;
  limit?: string;
  state?: string;
  status?: string;
}

interface Invitation {
  id: number;
  name: string;
  lastname: string | null;
  slug: string;
  is_active: boolean;
  is_confirmed: boolean;
  secondary_name: string | null;
  secondary_lastname: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TopInvitationsPage: React.FC<TopInvitationsPageProps> = ({ 
  page: initialPage = '1', 
  limit: initialLimit = '50',
  state: initialState = '',
  status: initialStatus = ''
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: parseInt(initialPage),
    limit: parseInt(initialLimit),
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    state: initialState,
    status: initialStatus
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [pagination.page, pagination.limit, filters.state, filters.status]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.state) {
        params.append('state', filters.state);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/analytics/top-invitations?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }

      const result = await response.json();
      
      if (result.success) {
        setInvitations(result.data.invitations);
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

  const handleFilterChange = (filterType: 'state' | 'status', value: string) => {
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
    setFilters({ state: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('state');
    url.searchParams.delete('status');
    url.searchParams.set('page', '1');
    window.history.pushState({}, '', url.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando invitaciones...</p>
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
      <AdminHeader title="Invitaciones Más Vistas" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lista de Invitaciones</h2>
              <p className="mt-2 text-sm text-gray-600">
                Lista completa de todas las invitaciones ordenadas por número de vistas
              </p>
            </div>
          </div>
        </div>

      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              <p className="text-sm text-gray-600">Total de Invitaciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {invitations.reduce((sum, inv) => sum + (inv.view_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Total de Vistas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {invitations.filter(inv => inv.is_confirmed).length}
              </p>
              <p className="text-sm text-gray-600">Confirmadas</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Estado
                </label>
                <select
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="viewed">Vistas</option>
                  <option value="not_viewed">No vistas</option>
                </select>
              </div>
              
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Confirmación
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Todas las confirmaciones</option>
                  <option value="confirmed">Confirmadas</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>
              
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center gap-2"
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

        {/* Invitations List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Lista de Invitaciones</h3>
          </div>
          
          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay invitaciones</h3>
              <p className="mt-1 text-sm text-gray-500">No se encontraron invitaciones activas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posición
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitado
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vistas
                    </th>
                    <th className="hidden table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creada
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation, index) => {
                    const position = (pagination.page - 1) * pagination.limit + index + 1;
                    return (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                              {position}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.name} {invitation.lastname}
                            {invitation.secondary_name && (
                              <div className="text-gray-500 text-xs">
                                {invitation.secondary_name} {invitation.secondary_lastname ? ` ${invitation.secondary_lastname}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500">/{invitation.slug}</div>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">/{invitation.slug}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{invitation.view_count}</div>
                        </td>
                        <td className="hidden table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invitation.is_confirmed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invitation.is_confirmed ? 'Confirmada' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatLocalDate(invitation.created_at)}
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

export default TopInvitationsPage;
