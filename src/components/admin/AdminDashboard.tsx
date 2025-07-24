import React, { useState, useEffect } from 'react';
import type { Invitation, DashboardStats } from '../../types/admin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminApi, ApiError } from '../../utils/api';
import SettingsForm from './SettingsForm';

interface AdminDashboardProps {
  initialToken?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialToken }) => {
  const { token, isLoading: authLoading, logout } = useAdminAuth();
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
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  const handleDeleteInvitation = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta invitación? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await adminApi.deleteInvitation(id);
      
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      
      // Reload stats to update counts
      const statsResult = await adminApi.getStats();
      setStats(statsResult.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      alert(`Error: ${err instanceof Error ? err.message : 'Error al eliminar la invitación'}`);
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
    alert('¡Configuración actualizada exitosamente!');
    setActiveTab('invitations');
  };

  const handleSettingsCancel = () => {
    setActiveTab('invitations');
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
              <span className="text-sm text-gray-600">Bienvenido, Administrador</span>
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
              icon="👥"
              color="purple" 
            />
            <StatCard 
              title="Respuestas RSVP" 
              value={stats.totals.rsvps} 
              icon="✅"
              color="green" 
            />
            <StatCard 
              title="Total de Vistas" 
              value={stats.totals.views} 
              icon="👀"
              color="blue" 
            />
            <StatCard 
              title="RSVPs Pendientes" 
              value={stats.totals.pending_rsvps} 
              icon="⏰"
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
                onClick={() => setActiveTab(tab.key as any)}
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
          {activeTab === 'invitations' && (
            <InvitationsTab 
              invitations={invitations}
              onCreateInvitation={handleCreateInvitation}
              onEditInvitation={handleEditInvitation}
              onDeleteInvitation={handleDeleteInvitation}
            />
          )}
          
          {activeTab === 'analytics' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Analíticas</h3>
              <div className="text-center py-8 text-gray-500">
                Panel de analíticas próximamente...
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <SettingsForm 
              onSuccess={handleSettingsSuccess}
              onCancel={handleSettingsCancel}
            />
          )}
        </div>
      </div>
    </main>
  );
};

// StatCard Component
interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'purple' | 'green' | 'blue' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    purple: 'text-purple-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600'
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className={`text-2xl ${colorClasses[color]}`}>{icon}</span>
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
}

const InvitationsTab: React.FC<InvitationsTabProps> = ({ 
  invitations, 
  onCreateInvitation, 
  onEditInvitation, 
  onDeleteInvitation 
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
      const filter = urlParams.get('filter') as 'all' | 'confirmed' | 'pending' | 'inactive';
      return filter && ['all', 'confirmed', 'pending', 'inactive'].includes(filter) ? filter : 'all';
    }
    return 'all';
  };

  const [searchTerm, setSearchTerm] = useState(getInitialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'inactive'>(getInitialStatusFilter);

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
  const handleStatusFilterChange = (filter: 'all' | 'confirmed' | 'pending' | 'inactive') => {
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
      (statusFilter === 'inactive' && !invitation.is_active);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Gestionar Invitaciones</h3>
          <button 
            onClick={onCreateInvitation}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Crear Nueva Invitación
          </button>
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
  const [copied, setCopied] = useState(false);
  const invitationUrl = `${window.location.origin}/invite/${invitation.slug}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
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
      } else {
        // Fallback to copy URL
        handleCopyUrl();
      }
    } catch (err) {
      // If sharing is cancelled or fails, fallback to copy URL
      handleCopyUrl();
    }
  };

  const handlePreview = () => {
    window.open(`${invitationUrl}?preview=true`, '_blank');
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
            <span>👥 {invitation.number_of_passes} pases</span>
            <span>👀 {invitation.view_count} vistas</span>
            <span>✉️ {invitation.rsvp_count || 0} RSVPs</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Creado: {new Date(invitation.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-0 sm:space-x-2 sm:ml-4">
          <button 
            onClick={handlePreview}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden sm:inline">Vista Previa</span>
            <span className="sm:hidden">Previa</span>
          </button>
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

export default AdminDashboard; 