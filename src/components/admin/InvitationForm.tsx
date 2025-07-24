import React, { useState, useEffect } from 'react';
import type { InvitationFormData, CreateInvitationRequest } from '../../types/admin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminApi, ApiError } from '../../utils/api';

interface InvitationFormProps {
  onSuccess?: (invitation: any) => void;
  onCancel?: () => void;
  onDelete?: (id: number) => void;
  initialData?: Partial<InvitationFormData>;
  mode?: 'create' | 'edit';
  invitationId?: string;
  searchParams?: { search?: string; filter?: string };
}

const InvitationForm: React.FC<InvitationFormProps> = ({ 
  onSuccess, 
  onCancel,
  onDelete,
  initialData,
  mode = 'create',
  invitationId,
  searchParams
}) => {
  const { token, isLoading: authLoading } = useAdminAuth();
  const [formData, setFormData] = useState<InvitationFormData>({
    name: '',
    lastname: '',
    slug: '',
    number_of_passes: 1,
    is_confirmed: false,
    is_active: true,
    ...(mode === 'create' ? initialData : {}) // Only use initialData in create mode
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugGenerated, setSlugGenerated] = useState(false);

  // Auto-generate slug from names
  useEffect(() => {
    if ((formData.name || formData.lastname) && !slugGenerated && mode === 'create') {
      const slug = generateSlug(formData.name, formData.lastname);
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, formData.lastname, slugGenerated, mode]);

  // Load invitation data when in edit mode
  useEffect(() => {
    if (mode === 'edit' && invitationId && token) {
      loadInvitationData();
    }
  }, [mode, invitationId, token]);

  const loadInvitationData = async () => {
    if (!invitationId || !token) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await adminApi.getInvitation(parseInt(invitationId));
      if (result.data) {
        console.log('Loaded invitation data:', result.data); // Debug log
        setFormData({
          name: result.data.name || '',
          lastname: result.data.lastname || '',
          slug: result.data.slug || '',
          number_of_passes: result.data.number_of_passes || 1,
          is_confirmed: Boolean(result.data.is_confirmed),
          is_active: Boolean(result.data.is_active)
        });
        setSlugGenerated(true); // Don't auto-generate slug in edit mode
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Autenticación requerida');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar la invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (firstName: string, lastName: string): string => {
    return `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'number_of_passes') {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({ ...prev, [name]: Math.max(0, Math.min(10, numValue)) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Track if slug was manually edited
    if (name === 'slug' && value !== generateSlug(formData.name, formData.lastname)) {
      setSlugGenerated(true);
    }

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'El nombre es requerido';
    if (!formData.lastname.trim()) return 'El apellido es requerido';
    if (!formData.slug.trim()) return 'La URL personalizada es requerida';
    if (!/^[a-z0-9-]+$/.test(formData.slug)) return 'La URL personalizada solo puede contener letras minúsculas, números y guiones';
    if (formData.number_of_passes < 1 || formData.number_of_passes > 10) return 'El número de pases debe estar entre 1 y 10';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!token) {
        setError('Autenticación requerida');
        return;
      }

      // Prepare request data
      const requestData: CreateInvitationRequest = {
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        slug: formData.slug.trim(),
        number_of_passes: formData.number_of_passes,
        is_confirmed: formData.is_confirmed,
        is_active: formData.is_active
      };

      let result;
      if (mode === 'edit' && invitationId) {
        // Update existing invitation
        result = await adminApi.updateInvitation(parseInt(invitationId), requestData);
      } else {
        // Create new invitation
        result = await adminApi.createInvitation(requestData);
      }

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        // Preserve search parameters when redirecting back
        const adminUrl = new URL('/admin', window.location.origin);
        if (searchParams?.search) {
          adminUrl.searchParams.set('search', searchParams.search);
        }
        if (searchParams?.filter) {
          adminUrl.searchParams.set('filter', searchParams.filter);
        }
        window.location.href = adminUrl.toString();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Autenticación requerida');
        return;
      }
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('¿Estás seguro de que quieres cancelar? Cualquier cambio sin guardar se perderá.')) {
      if (onCancel) {
        onCancel();
      } else {
        // Preserve search parameters when redirecting back
        const adminUrl = new URL('/admin', window.location.origin);
        if (searchParams?.search) {
          adminUrl.searchParams.set('search', searchParams.search);
        }
        if (searchParams?.filter) {
          adminUrl.searchParams.set('filter', searchParams.filter);
        }
        window.location.href = adminUrl.toString();
      }
    }
  };

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de que quieres eliminar la invitación de ${formData.name} ${formData.lastname}? Esta acción no se puede deshacer.`)) {
      if (invitationId && (window as any).handleDeleteInvitation) {
        (window as any).handleDeleteInvitation(parseInt(invitationId));
      }
    }
  };

  const handlePreview = () => {
    if (formData.slug) {
      window.open(`/invite/${formData.slug}?preview=true`, '_blank');
    } else {
      alert('Por favor completa los nombres de los invitados para generar una URL de vista previa');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Autenticando...</p>
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
              <button 
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? 'Crear Nueva Invitación' : 'Editar Invitación'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                type="button"
                onClick={handlePreview}
                disabled={!formData.slug}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Vista Previa
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Guest Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Información del Invitado</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                    placeholder="Maria"
                  />
                </div>

                <div>
                  <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="lastname"
                    id="lastname"
                    required
                    value={formData.lastname}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                    placeholder="Rodriguez"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                    URL Personalizada *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      julifestxv.aegre.me/
                    </span>
                    <input
                      type="text"
                      name="slug"
                      id="slug"
                      required
                      pattern="^[a-z0-9-]+$"
                      value={formData.slug}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                      placeholder="maria-rodriguez"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Solo letras minúsculas, números y guiones</p>
                </div>

                <div>
                  <label htmlFor="number_of_passes" className="block text-sm font-medium text-gray-700">
                    Número de Pases *
                  </label>
                  <input
                    type="number"
                    name="number_of_passes"
                    id="number_of_passes"
                    min="1"
                    max="20"
                    required
                    value={formData.number_of_passes}
                    onChange={handleInputChange}
                    onFocus={(e) => e.target.select()}
                    disabled={isLoading}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_confirmed"
                        id="is_confirmed"
                        checked={formData.is_confirmed}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_confirmed" className="ml-2 block text-sm text-gray-900">
                        Confirmado
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Activo
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note about global settings */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Configuración Global</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Los detalles del evento y la configuración de RSVP se gestionan globalmente y se aplican a todas las invitaciones. Puedes configurar estos en la pestaña de Configuración.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Invitación
              </button>
            )}
            <div className="flex space-x-4 ml-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === 'create' ? 'Creando...' : 'Actualizando...'}
                  </div>
                ) : (
                  mode === 'create' ? 'Crear Invitación' : 'Actualizar Invitación'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};

export default InvitationForm; 