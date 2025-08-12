import React, { useState, useEffect } from 'react';
import { adminApi, ApiError } from '../../utils/api';
import { useToast, ToastProvider } from '../ui/Toast';
import type { PaginatedResponse } from '../../types/admin';
import { formatLocalDate } from '../../utils/dateUtils';
import AdminHeader from './AdminHeader';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface UserListProps {
  onEditUser?: (user: User) => void;
  onRefresh?: () => void;
}

const UserListContent: React.FC<UserListProps> = ({ onEditUser, onRefresh }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Get current user ID on component mount
  useEffect(() => {
    const currentUserStr = localStorage.getItem('admin_user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        setCurrentUserId(currentUser.id);
      } catch (err) {
        console.error('Error parsing current user:', err);
      }
    }
  }, []);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getUsers() as PaginatedResponse<User>;
      if (response.success) {
        setUsers(response.data || []);
        setPagination(response.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 0
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Handle authentication error
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar los usuarios');
      showToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los usuarios'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadUsers(newPage);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    // Get current user info to prevent self-deletion and protect admin user
    const currentUserStr = localStorage.getItem('admin_user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        
        // Prevent self-deletion
        if (currentUser.id === userId) {
          showToast({
            type: 'error',
            title: 'Error',
            message: 'No puedes eliminar tu propia cuenta de usuario.'
          });
          return;
        }
        
        // Protect the "admin" user (username = "admin")
        if (username.toLowerCase() === 'admin') {
          showToast({
            type: 'error',
            title: 'Error',
            message: 'No se puede eliminar el usuario administrador principal del sistema.'
          });
          return;
        }
      } catch (err) {
        // If we can't parse the user info, continue with the deletion
      }
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await adminApi.deleteUser(userId);
      if (response.success) {
        showToast({
          type: 'success',
          title: 'Usuario eliminado',
          message: `El usuario "${username}" ha sido eliminado exitosamente.`
        });
        // Reload the current page
        loadUsers(pagination.page);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al eliminar el usuario';
      showToast({
        type: 'error',
        title: 'Error al eliminar usuario',
        message: errorMessage
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = formatLocalDate;

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Editor';
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => loadUsers()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminHeader title="Gestión de Usuarios" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lista de Usuarios</h2>
              <p className="mt-2 text-sm text-gray-600">
                Gestiona los usuarios que tienen acceso al panel de administración
              </p>
            </div>
            <a
              href="/admin/users/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear Usuario
            </a>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">

        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-sm text-gray-500">
              No se encontraron usuarios en el sistema.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(user.is_active)}`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <a
                            href={`/admin/users/edit/${user.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Editar
                          </a>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={deletingUserId === user.id || user.username.toLowerCase() === 'admin' || currentUserId === user.id}
                            className={`text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                              deletingUserId === user.id || user.username.toLowerCase() === 'admin' || currentUserId === user.id ? 'cursor-not-allowed' : ''
                            }`}
                            title={
                              user.username.toLowerCase() === 'admin' 
                                ? 'No se puede eliminar el usuario administrador principal' 
                                : currentUserId === user.id 
                                  ? 'No puedes eliminar tu propia cuenta'
                                  : ''
                            }
                          >
                            {deletingUserId === user.id ? (
                              <div className="flex items-center">
                                <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Eliminando...
                              </div>
                            ) : (
                              'Eliminar'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {users.map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {user.username}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {user.email}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(user.is_active)}`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <a
                        href={`/admin/users/edit/${user.id}`}
                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                      >
                        Editar
                      </a>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={deletingUserId === user.id || user.username.toLowerCase() === 'admin' || currentUserId === user.id}
                        className={`text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium ${
                          deletingUserId === user.id || user.username.toLowerCase() === 'admin' || currentUserId === user.id ? 'cursor-not-allowed' : ''
                        }`}
                        title={
                          user.username.toLowerCase() === 'admin' 
                            ? 'No se puede eliminar el usuario administrador principal' 
                            : currentUserId === user.id 
                              ? 'No puedes eliminar tu propia cuenta'
                              : ''
                        }
                      >
                        {deletingUserId === user.id ? (
                          <div className="flex items-center">
                            <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Eliminando...
                          </div>
                        ) : (
                          'Eliminar'
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Creado: {formatDate(user.created_at)}</div>
                    <div>Último acceso: {user.last_login ? formatDate(user.last_login) : 'Nunca'}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span> de{' '}
                  <span className="font-medium">{pagination.total}</span> resultados
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Anterior</span>
                    <span className="sm:hidden">Ant</span>
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-md">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="sm:hidden">Sig</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    </main>
  );
};

const UserList: React.FC<UserListProps> = ({ onEditUser, onRefresh }) => {
  return (
    <ToastProvider>
      <UserListContent onEditUser={onEditUser} onRefresh={onRefresh} />
    </ToastProvider>
  );
};

export default UserList; 