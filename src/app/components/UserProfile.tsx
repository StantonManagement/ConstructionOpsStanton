import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  phone: string;
  avatar_url: string;
  company: string;
  address: string;
  created_at: string;
}

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (profileData: ProfileData) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, onProfileUpdate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    role: '',
    phone: '',
    avatar_url: '',
    company: '',
    address: '',
    created_at: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('Not authenticated. Please log in.');
          setLoading(false);
          return;
        }
        
        setUser(user);
        
        const { data, error } = await supabase
          .from('users')
          .select('name, email, role, phone, avatar_url, company, address, created_at')
          .eq('uuid', user.id)
          .single();
          
        if (error) {
          console.error('Profile fetch error:', error);
          setError('Failed to fetch profile data.');
        } else {
          setProfile({
            name: data?.name || '',
            email: data?.email || user.email || '',
            role: data?.role || '',
            phone: data?.phone || '',
            avatar_url: data?.avatar_url || '',
            company: data?.company || '',
            address: data?.address || '',
            created_at: data?.created_at || '',
          });
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (value && !/^[\+]?[1-9][\d\s\-\(\)]{7,}$/.test(value.replace(/\s/g, ''))) {
          return 'Please enter a valid phone number';
        }
        return '';
      case 'avatar_url':
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          return 'Please enter a valid URL starting with http:// or https://';
        }
        return '';
      default:
        return '';
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Reset avatar error when URL changes
    if (name === 'avatar_url') {
      setAvatarError(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const errors: Record<string, string> = {};
    Object.keys(profile).forEach(key => {
      if (key !== 'role' && key !== 'created_at') {
        const error = validateField(key, profile[key as keyof ProfileData]);
        if (error) errors[key] = error;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    
    try {
      if (!user?.id) {
        setError('User not authenticated.');
        return;
      }

      // Use upsert to avoid CORS issues with PATCH method
      const { data, error } = await supabase
        .from('users')
        .upsert({
          uuid: user.id,
          name: profile.name.trim(),
          email: profile.email.trim().toLowerCase(),
          phone: profile.phone.trim(),
          avatar_url: profile.avatar_url.trim(),
          company: profile.company.trim(),
          address: profile.address.trim(),
          role: profile.role, // preserve existing role
        }, {
          onConflict: 'uuid'
        });
        
      if (error) {
        console.error('Update error:', error);
        setError(`Failed to update profile: ${error.message}`);
      } else {
        setSuccess('Profile updated successfully!');
        // Notify parent component about profile update
        if (onProfileUpdate) {
          onProfileUpdate(profile);
        }
        // Clear success message after 3 seconds
        const timer = setTimeout(() => setSuccess(null), 3000);
        return () => clearTimeout(timer);
      }
    } catch (err: any) {
      console.error('Unexpected update error:', err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetSent(false);
    setError(null);
    setResettingPassword(true);
    
    if (!profile.email.trim()) {
      setError('Email is required for password reset.');
      setResettingPassword(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setError(`Failed to send reset email: ${error.message}`);
      } else {
        setResetSent(true);
        // Clear reset sent message after 5 seconds
        const timer = setTimeout(() => setResetSent(false), 5000);
        return () => clearTimeout(timer);
      }
    } catch (err: any) {
      setError('Failed to send reset email.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
      onClick={handleBackdropClick}
    >
      <div className={`fixed right-0 top-0 h-full w-full max-w-md sm:max-w-lg bg-white shadow-2xl transform transition-transform duration-300 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-600 text-sm">Loading profile...</p>
            </div>
          </div>
        ) : error && !user ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-red-600 text-center">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-base font-semibold">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-4 sm:py-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
                aria-label="Close profile"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-white pr-10">User Profile</h2>
              <p className="text-sm text-blue-100 mt-1">Manage your account information</p>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleUpdate} className="space-y-4 sm:space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-4 sm:mb-6">
                <div className="relative">
                  {profile.avatar_url && !avatarError ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile avatar" 
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={() => setAvatarError(true)}
                      onLoad={() => setAvatarError(false)}
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg border-4 border-white">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mt-3 sm:mt-4 w-full max-w-md">
                  <label htmlFor="avatar_url" className="block text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Avatar URL</label>
                  <input
                    id="avatar_url"
                    type="url"
                    name="avatar_url"
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-lg sm:rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base ${
                      validationErrors.avatar_url ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    value={profile.avatar_url}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    aria-describedby={validationErrors.avatar_url ? 'avatar_url-error' : undefined}
                  />
                  {validationErrors.avatar_url && (
                    <p id="avatar_url-error" className="text-red-500 text-xs mt-1">{validationErrors.avatar_url}</p>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                    Name <span className="text-red-500" aria-label="required">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-lg text-gray-700 sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base ${
                      validationErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    value={profile.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                    aria-describedby={validationErrors.name ? 'name-error' : undefined}
                  />
                  {validationErrors.name && (
                    <p id="name-error" className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email <span className="text-red-500" aria-label="required">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className={`w-full px-3 py-2 text-gray-700 sm:px-4 sm:py-3 border rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base ${
                      validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    value={profile.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                    aria-describedby={validationErrors.email ? 'email-error' : undefined}
                  />
                  {validationErrors.email && (
                    <p id="email-error" className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    className={`w-full px-3 py-2 text-gray-700 sm:px-4 sm:py-3 border rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base ${
                      validationErrors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    aria-describedby={validationErrors.phone ? 'phone-error' : 'phone-help'}
                  />
                  {validationErrors.phone ? (
                    <p id="phone-error" className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                  ) : (
                    <p id="phone-help" className="text-gray-500 text-xs mt-1 hidden sm:block">Format: +1 (555) 123-4567</p>
                  )}
                </div>

                {/*<div className="space-y-1 sm:space-y-2">
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700">Company</label>
                  <input
                    id="company"
                    type="text"
                    name="company"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base"
                    value={profile.company}
                    onChange={handleChange}
                    placeholder="Your company name"
                  />
                </div>*/}

                <div className="space-y-1 sm:space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Role</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-100/70 text-gray-600 cursor-not-allowed backdrop-blur-sm text-sm sm:text-base"
                    value={profile.role}
                    disabled
                    placeholder="Role assigned by admin"
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Member Since</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-100/70 text-gray-600 cursor-not-allowed backdrop-blur-sm text-sm sm:text-base"
                    value={profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : ''}
                    disabled
                  />
                </div>
              </div>

              {/* Address Field */}
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700">Address</label>
                <textarea
                  id="address"
                  name="address"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border text-gray-700 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm resize-none text-sm sm:text-base"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Your full address"
                  rows={2}
                />
              </div>

              {/* Status Messages */}
              {(success || error) && (
                <div className="space-y-2">
                  {success && (
                    <div className="flex items-center space-x-2 text-green-700 bg-green-50/80 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-green-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium text-sm sm:text-base">{success}</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center space-x-2 text-red-700 bg-red-50/80 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-red-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-sm sm:text-base">{error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Update Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-sm sm:text-base"
                disabled={updating}
              >
                {updating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Profile'
                )}
              </button>
            </form>

              {/* Password Reset Section */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="text-center space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Security</h3>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword}
                  >
                    {resettingPassword ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Send Password Reset Email'
                    )}
                  </button>
                  {resetSent && (
                    <div className="flex items-center justify-center space-x-2 text-green-700 bg-green-50/80 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-green-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-sm sm:text-base">Password reset email sent!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;