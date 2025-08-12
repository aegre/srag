import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AdminHeaderProps {
  title?: string;
  showStats?: boolean;
  stats?: any;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  title = "Panel de Administración",
  showStats = false,
  stats
}) => {
  const { user, isAdmin, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
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

      {/* Quick Stats */}
      {showStats && stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        </div>
      )}
    </>
  );
};

// StatCard Component (copied from AdminDashboard)
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

export default AdminHeader;
