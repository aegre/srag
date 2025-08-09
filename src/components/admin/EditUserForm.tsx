import React, { useState, useEffect } from 'react';
import { adminApi, ApiError } from '../../utils/api';
import { useToast, ToastProvider } from '../ui/Toast';

interface EditUserFormProps {
  userId: string;
  onSuccess?: () => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'editor';
  is_active: boolean;
}

const EditUserFormContent: React.FC<EditUserFormProps> = ({ userId }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'editor',
    is_active: true
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setInitialLoading(true);
    try {
      const response = await adminApi.getUser(parseInt(userId));
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        setFormData({
          username: userData.username,
          email: userData.email,
          password: '',
          confirmPassword: '',
          role: userData.role,
          is_active: userData.is_active
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la información del usuario'
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.length > 20) {
      newErrors.username = 'El nombre de usuario no puede exceder 20 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    // Password validation (only if password is provided)
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }
      
      // Confirm password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma la contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData: any = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        is_active: formData.is_active
      };

      // Only include password if it was provided
      if (formData.password) {
        userData.password = formData.password;
      }
      
      const response = await adminApi.updateUser(parseInt(userId), userData);

      if (response.success) {
        showToast({
          type: 'success',
          title: 'Usuario actualizado exitosamente',
          message: `El usuario "${formData.username}" ha sido actualizado.`
        });
        
        // Navigate back to users list after successful update
        setTimeout(() => {
          window.location.href = '/admin/users';
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al actualizar el usuario';
      setSubmitError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error al actualizar usuario',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">No se pudo cargar la información del usuario.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
            Editar Usuario: {user.username}
          </h3>
          <p className="text-sm text-gray-600">
            Modifica la información del usuario. Deja la contraseña en blanco si no quieres cambiarla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                errors.username ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="usuario123"
              disabled={loading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Deja en blanco para mantener la actual"
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Deja en blanco si no quieres cambiar la contraseña actual.
            </p>
          </div>

          {/* Confirm Password */}
          {formData.password && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Repite la nueva contraseña"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as 'admin' | 'editor')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              disabled={loading}
            >
              <option value="editor">Editor</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Los administradores pueden crear otros usuarios y acceder a todas las funciones. Los editores pueden gestionar invitaciones.
            </p>
          </div>

          {/* Active Status */}
          <div>
            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Usuario activo
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Los usuarios inactivos no pueden acceder al panel de administración.
            </p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </div>
              ) : (
                'Actualizar Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditUserForm: React.FC<EditUserFormProps> = ({ userId, onSuccess }) => {
  return (
    <ToastProvider>
      <EditUserFormContent userId={userId} onSuccess={onSuccess} />
    </ToastProvider>
  );
};

export default EditUserForm; 