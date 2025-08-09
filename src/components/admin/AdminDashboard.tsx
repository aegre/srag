import React, { useState, useEffect } from 'react';
import type { Invitation, DashboardStats } from '../../types/admin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminApi, ApiError } from '../../utils/api';
import SettingsForm from './SettingsForm';
import AnalyticsTab from './AnalyticsTab';
import { useToast } from '../ui/Toast';
import { ToastProvider } from '../ui/Toast';

interface AdminDashboardProps {
  initialToken?: string;
}

const AdminDashboardContent: React.FC = () => {
  const { token, isLoading: authLoading, logout, user, isAdmin } = useAdminAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeTab, setActiveTab] = useState<'invitations' | 'analytics' | 'settings'>('invitations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data when token is available
  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      // Load stats and invitations in parallel
      const [statsResult, invitationsResult] = await Promise.all([
        adminApi.getStats(),
        adminApi.getInvitations()
      ]);

      setStats(statsResult.data);
      setInvitations(invitationsResult.data || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showToast({
      type: 'info',
      title: 'Cerrando sesión',
      message: 'Has cerrado sesión exitosamente.'
    });
      logout();
  };

  const handleDeleteInvitation = async (id: number) => {
    // For now, we'll delete without confirmation, but show a toast
    // In a real app, you might want to add a confirmation dialog
    showToast({
      type: 'warning',
      title: 'Eliminando invitación',
      message: 'La invitación será eliminada permanentemente.'
    });

    try {
      await adminApi.deleteInvitation(id);
      
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      
      // Reload stats to update counts
      const statsResult = await adminApi.getStats();
      setStats(statsResult.data);
      
      showToast({
        type: 'success',
        title: 'Invitación eliminada',
        message: 'La invitación ha sido eliminada exitosamente.'
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la invitación';
      showToast({
        type: 'error',
        title: 'Error al eliminar',
        message: errorMessage
      });
    }
  };

  const handleCreateInvitation = () => {
    window.location.href = '/admin/create';
  };

  const handleEditInvitation = (id: number) => {
    // Preserve current filters in the URL when editing
    const currentUrl = new URL(window.location.href);
    const editUrl = new URL(`/admin/edit/${id}`, window.location.origin);
    
    // Copy search and filter parameters
    if (currentUrl.searchParams.has('search')) {
      editUrl.searchParams.set('search', currentUrl.searchParams.get('search')!);
    }
    if (currentUrl.searchParams.has('filter')) {
      editUrl.searchParams.set('filter', currentUrl.searchParams.get('filter')!);
    }
    
    window.location.href = editUrl.toString();
  };

  const handleSettingsSuccess = () => {
    showToast({
      type: 'success',
      title: 'Configuración actualizada',
      message: 'Los cambios han sido guardados exitosamente.'
    });
    setActiveTab('invitations');
  };

  const handleSettingsCancel = () => {
    setActiveTab('invitations');
  };

  const [exporting, setExporting] = useState(false);

  const handleExportInvitations = async () => {
    if (exporting) return;
    
    setExporting(true);
    try {
      const response = await adminApi.exportInvitations();
      
      if (!response.ok) {
        throw new Error('Error al exportar las invitaciones');
      }

      // Create a blob from the response and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitaciones_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast({
        type: 'success',
        title: 'Exportación completada',
        message: 'El archivo CSV ha sido descargado exitosamente.'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar las invitaciones';
      showToast({
        type: 'error',
        title: 'Error en la exportación',
        message: errorMessage
      });
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Autenticando...' : 'Cargando panel...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={loadDashboardData}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                Julietta XV Años
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Bienvenido, {user?.username || 'Administrador'}
                  </span>
                  {isAdmin && (
                    <a
                      href="/admin/users"
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                      title="Gestionar usuarios del sistema"
                    >
                      Usuarios
                    </a>
                  )}
                </div>
                {stats?.settings?.is_published ? (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Publicado
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    No Publicado
                  </span>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <StatCard 
              title="Total de Invitaciones" 
              value={stats.totals.invitations} 
              icon="users"
              color="purple" 
            />
            <StatCard 
              title="Invitaciones Confirmadas" 
              value={stats.totals.rsvps} 
              icon="check"
              color="green" 
            />
            <StatCard 
              title="Total de invitaciones Vistas" 
              value={stats.totals.views} 
              icon="chart"
              color="blue" 
            />
            <StatCard 
              title="Invitaciones Pendientes" 
              value={stats.totals.pending_rsvps} 
              icon="calendar"
              color="yellow" 
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex justify-center sm:justify-start space-x-2 sm:space-x-8 overflow-x-auto">
            {[
              { key: 'invitations', label: 'Invitaciones' },
              { key: 'analytics', label: 'Analíticas' },
              { key: 'settings', label: 'Configuración' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'invitations' | 'analytics' | 'settings')}
                className={`whitespace-nowrap py-3 sm:py-2 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm capitalize min-w-fit ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div className={activeTab === 'invitations' ? 'block' : 'hidden'}>
            <InvitationsTab 
              invitations={invitations}
              onCreateInvitation={handleCreateInvitation}
              onEditInvitation={handleEditInvitation}
              onDeleteInvitation={handleDeleteInvitation}
              onExportInvitations={handleExportInvitations}
              exporting={exporting}
            />
          </div>
          
          <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
            <AnalyticsTab />
          </div>
          
          <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <SettingsForm 
              onSuccess={handleSettingsSuccess}
              onCancel={handleSettingsCancel}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

// StatCard Component
interface StatCardProps {
  title: string;
  value: number;
  icon: 'users' | 'check' | 'eye' | 'calendar' | 'chart';
  color: 'purple' | 'green' | 'blue' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  const iconComponents = {
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    eye: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    chart: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
              {iconComponents[icon]}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

// InvitationsTab Component
interface InvitationsTabProps {
  invitations: Invitation[];
  onCreateInvitation: () => void;
  onEditInvitation: (id: number) => void;
  onDeleteInvitation: (id: number) => void;
  onExportInvitations: () => void;
  exporting: boolean;
}

const InvitationsTab: React.FC<InvitationsTabProps> = ({ 
  invitations, 
  onCreateInvitation, 
  onEditInvitation, 
  onDeleteInvitation,
  onExportInvitations,
  exporting
}) => {
  // Get initial state from URL parameters
  const getInitialSearchTerm = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('search') || '';
    }
    return '';
  };

  const getInitialStatusFilter = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const filter = urlParams.get('filter') as 'all' | 'confirmed' | 'pending' | 'inactive' | 'unopened';
      return filter && ['all', 'confirmed', 'pending', 'inactive', 'unopened'].includes(filter) ? filter : 'all';
    }
    return 'all';
  };

  const [searchTerm, setSearchTerm] = useState(getInitialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'inactive' | 'unopened'>(getInitialStatusFilter);

  // Update URL with current filters
  const updateURL = (newSearchTerm: string, newStatusFilter: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newSearchTerm) {
        url.searchParams.set('search', newSearchTerm);
      } else {
        url.searchParams.delete('search');
      }
      if (newStatusFilter && newStatusFilter !== 'all') {
        url.searchParams.set('filter', newStatusFilter);
      } else {
        url.searchParams.delete('filter');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Handle search term change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateURL(value, statusFilter);
  };

  // Handle status filter change
  const handleStatusFilterChange = (filter: 'all' | 'confirmed' | 'pending' | 'inactive' | 'unopened') => {
    setStatusFilter(filter);
    updateURL(searchTerm, filter);
  };

  // Filter invitations based on search term and status
  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = searchTerm === '' || 
      invitation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitation.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitation.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'confirmed' && invitation.is_confirmed) ||
      (statusFilter === 'pending' && !invitation.is_confirmed && invitation.is_active) ||
      (statusFilter === 'inactive' && !invitation.is_active) ||
      (statusFilter === 'unopened' && invitation.view_count === 0);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Gestionar Invitaciones</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={onExportInvitations}
              disabled={exporting}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${
                exporting 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {exporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">Exportar</span>
                </>
              )}
            </button>
          <button 
            onClick={onCreateInvitation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Crear Nueva Invitación</span>
              <span className="sm:hidden">Nueva Invitación</span>
          </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o URL..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusFilterChange('all')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos ({invitations.length})
              </button>
              <button
                onClick={() => handleStatusFilterChange('confirmed')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Confirmados ({invitations.filter(i => i.is_confirmed).length})
              </button>
              <button
                onClick={() => handleStatusFilterChange('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pendientes ({invitations.filter(i => !i.is_confirmed && i.is_active).length})
              </button>
                          <button
              onClick={() => handleStatusFilterChange('inactive')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inactivos ({invitations.filter(i => !i.is_active).length})
            </button>
            <button
              onClick={() => handleStatusFilterChange('unopened')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === 'unopened'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sin Abrir ({invitations.filter(i => i.view_count === 0).length})
            </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-gray-600">
            Mostrando {filteredInvitations.length} de {invitations.length} invitaciones
            {searchTerm && ` para "${searchTerm}"`}
            {statusFilter !== 'all' && ` (${statusFilter === 'confirmed' ? 'confirmados' : statusFilter === 'pending' ? 'pendientes' : 'inactivos'})`}
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {invitations.length === 0 ? (
                <>
                  <p className="mb-4">Aún no se han creado invitaciones.</p>
                  <button 
                    onClick={onCreateInvitation}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Crear Tu Primera Invitación
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-4">No se encontraron invitaciones con los filtros aplicados.</p>
                  <button 
                    onClick={() => {
                      handleSearchChange('');
                      handleStatusFilterChange('all');
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredInvitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onEdit={onEditInvitation}
                onDelete={onDeleteInvitation}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// InvitationCard Component
interface InvitationCardProps {
  invitation: Invitation;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const InvitationCard: React.FC<InvitationCardProps> = ({ invitation, onEdit, onDelete }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const invitationUrl = `${window.location.origin}/invite/${invitation.slug}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      showToast({
        type: 'success',
        title: 'URL copiada',
        message: 'La URL de la invitación ha sido copiada al portapapeles.'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invitationUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      showToast({
        type: 'success',
        title: 'URL copiada',
        message: 'La URL de la invitación ha sido copiada al portapapeles.'
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Invitación de ${invitation.name} ${invitation.lastname}`,
      text: `Te invito a mis XV Años`,
      url: invitationUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast({
          type: 'success',
          title: 'Invitación compartida',
          message: 'La invitación ha sido compartida exitosamente.'
        });
      } else {
        // Fallback to copy URL
        handleCopyUrl();
      }
    } catch (err) {
      // If sharing is cancelled or fails, fallback to copy URL
      if (err instanceof Error && err.name !== 'AbortError') {
        showToast({
          type: 'error',
          title: 'Error al compartir',
          message: 'No se pudo compartir la invitación. Se copió la URL al portapapeles.'
        });
      }
      handleCopyUrl();
    }
  };



  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button 
              onClick={() => onEdit(invitation.id)}
              className="text-lg font-medium text-gray-900 hover:text-purple-600 transition-colors text-left flex items-center gap-2 group"
            >
              {invitation.name} {invitation.lastname}
              <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {!invitation.is_active ? (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                Inactivo
              </span>
            ) : invitation.is_confirmed ? (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Confirmado
              </span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                Pendiente
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Slug: <code className="bg-gray-100 px-1 rounded break-all">{invitation.slug}</code>
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              {invitation.number_of_passes} pases
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {invitation.view_count} vistas
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Creado: {new Date(invitation.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-0 sm:space-x-2 sm:ml-4">
          <a 
            href={`/invite/${invitation.slug}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden sm:inline">Vista Previa</span>
            <span className="sm:hidden">Previa</span>
          </a>
          <button 
            onClick={handleShare}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium px-2 py-1 rounded hover:bg-orange-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="hidden sm:inline">Compartir</span>
            <span className="sm:hidden">Share</span>
          </button>
          <button 
            onClick={handleCopyUrl}
            className={`text-sm font-medium px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              copied 
                ? 'text-green-600 bg-green-50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Copiado</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Copiar URL</span>
                <span className="sm:hidden">URL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
    return (
    <ToastProvider>
      <AdminDashboardContent />
    </ToastProvider>
  );
};

export default AdminDashboard; 