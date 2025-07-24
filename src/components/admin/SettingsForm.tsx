import React, { useState, useEffect } from 'react';
import type { SettingsFormData, UpdateSettingsRequest } from '../../types/admin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminApi, ApiError } from '../../utils/api';

interface SettingsFormProps {
  onSuccess?: (settings: any) => void;
  onCancel?: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ 
  onSuccess, 
  onCancel
}) => {
  const { token, isLoading: authLoading } = useAdminAuth();
  const [formData, setFormData] = useState<SettingsFormData>({
    event_date: '',
    event_time: '',
    rsvp_enabled: true,
    rsvp_deadline: '',
    rsvp_phone: '',
    rsvp_whatsapp: '',
    is_published: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load current settings
  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token]);

  const loadSettings = async () => {
    try {
      const result = await adminApi.getSettings();
      if (result.data) {
        setFormData({
          event_date: result.data.event_date || '',
          event_time: result.data.event_time || '',
          rsvp_enabled: result.data.rsvp_enabled !== false,
          rsvp_deadline: result.data.rsvp_deadline || '',
          rsvp_phone: result.data.rsvp_phone || '',
          rsvp_whatsapp: result.data.rsvp_whatsapp || '',
          is_published: result.data.is_published || false
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Prepare request data
      const requestData: UpdateSettingsRequest = {
        event_date: formData.event_date || undefined,
        event_time: formData.event_time || undefined,
        rsvp_enabled: formData.rsvp_enabled,
        rsvp_deadline: formData.rsvp_deadline || undefined,
        rsvp_phone: formData.rsvp_phone.trim() || undefined,
        rsvp_whatsapp: formData.rsvp_whatsapp.trim() || undefined,
        is_published: formData.is_published
      };

      const result = await adminApi.updateSettings(requestData);

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        alert('Settings updated successfully!');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication required');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      if (onCancel) {
        onCancel();
      } else {
        window.location.href = '/admin';
      }
    }
  };

  if (authLoading || isLoadingSettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading settings...'}</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Details</h3>
              <p className="text-sm text-gray-600 mb-6">These settings apply to all invitations</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="event_date" className="block text-sm font-medium text-gray-700">
                      Event Date
                    </label>
                    <input
                      type="date"
                      name="event_date"
                      id="event_date"
                      value={formData.event_date}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label htmlFor="event_time" className="block text-sm font-medium text-gray-700">
                      Event Time
                    </label>
                    <input
                      type="time"
                      name="event_time"
                      id="event_time"
                      value={formData.event_time}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RSVP Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">RSVP Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="rsvp_enabled"
                    id="rsvp_enabled"
                    checked={formData.rsvp_enabled}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rsvp_enabled" className="ml-2 block text-sm text-gray-900">
                    Enable RSVP functionality
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="rsvp_deadline" className="block text-sm font-medium text-gray-700">
                      RSVP Deadline
                    </label>
                    <input
                      type="date"
                      name="rsvp_deadline"
                      id="rsvp_deadline"
                      value={formData.rsvp_deadline}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label htmlFor="rsvp_phone" className="block text-sm font-medium text-gray-700">
                      RSVP Phone
                    </label>
                    <input
                      type="tel"
                      name="rsvp_phone"
                      id="rsvp_phone"
                      value={formData.rsvp_phone}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                      placeholder="+52 55 1234 5678"
                    />
                  </div>

                  <div>
                    <label htmlFor="rsvp_whatsapp" className="block text-sm font-medium text-gray-700">
                      RSVP WhatsApp
                    </label>
                    <input
                      type="tel"
                      name="rsvp_whatsapp"
                      id="rsvp_whatsapp"
                      value={formData.rsvp_whatsapp}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Publication Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Publication Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_published"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900">
                    Publish invitations (make them publicly accessible)
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  When published, all active invitations will be accessible to guests. When unpublished, invitations will show a "coming soon" message.
                </p>
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
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default SettingsForm; 