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
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleDeleteInvitation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) {
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
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete invitation'}`);
    }
  };

  const handleCreateInvitation = () => {
    window.location.href = '/admin/create';
  };

  const handleEditInvitation = (id: number) => {
    window.location.href = `/admin/edit/${id}`;
  };

  const handleSettingsSuccess = () => {
    alert('Settings updated successfully!');
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
          <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading dashboard...'}</p>
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
            Try Again
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Julietta XV Años
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, Admin</span>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Invitations" 
              value={stats.totals.invitations} 
              icon="👥"
              color="purple" 
            />
            <StatCard 
              title="RSVP Responses" 
              value={stats.totals.rsvps} 
              icon="✅"
              color="green" 
            />
            <StatCard 
              title="Total Views" 
              value={stats.totals.views} 
              icon="👀"
              color="blue" 
            />
            <StatCard 
              title="Pending RSVPs" 
              value={stats.totals.pending_rsvps} 
              icon="⏰"
              color="yellow" 
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['invitations', 'analytics', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Overview</h3>
              <div className="text-center py-8 text-gray-500">
                Analytics dashboard coming soon...
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
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Manage Invitations</h3>
          <button 
            onClick={onCreateInvitation}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Create New Invitation
          </button>
        </div>
        
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No invitations created yet.</p>
              <button 
                onClick={onCreateInvitation}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create Your First Invitation
              </button>
            </div>
          ) : (
            invitations.map((invitation) => (
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
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-medium text-gray-900">
              {invitation.name} {invitation.lastname}
            </h4>
            {invitation.is_confirmed && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Confirmed
              </span>
            )}
            {!invitation.is_active && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Slug: <code className="bg-gray-100 px-1 rounded">{invitation.slug}</code>
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>👥 {invitation.number_of_passes} passes</span>
            <span>👀 {invitation.view_count} views</span>
            <span>✉️ {invitation.rsvp_count || 0} RSVPs</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Created: {new Date(invitation.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <a 
            href={`/invite/${invitation.slug}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View
          </a>
          <button 
            onClick={() => onEdit(invitation.id)}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete(invitation.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 