import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({ name: '', email: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }
      setUser(user);
      const { data, error } = await supabase
        .from('users')
        .select('name, email, role')
        .eq('id', user.id)
        .single();
      if (error) {
        setError('Failed to fetch profile.');
      } else {
        setProfile({
          name: data?.name || '',
          email: data?.email || user.email,
          role: data?.role || '',
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: profile.name, email: profile.email })
        .eq('id', user.id);
      if (error) {
        setError('Failed to update profile.');
      } else {
        setSuccess('Profile updated!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetSent(false);
    if (!profile.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (!error) setResetSent(true);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">User Profile</h2>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            name="name"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={profile.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={profile.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
            value={profile.role}
            disabled
          />
        </div>
        {success && <div className="text-green-600 text-sm text-center">{success}</div>}
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          disabled={updating}
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button
          className="text-blue-600 hover:underline text-sm"
          onClick={handlePasswordReset}
        >
          Send password reset email
        </button>
        {resetSent && <div className="text-green-600 text-xs mt-2">Reset email sent!</div>}
      </div>
    </div>
  );
};

export default UserProfile; 