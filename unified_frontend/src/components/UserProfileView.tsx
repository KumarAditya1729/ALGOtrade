// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchUserProfile, fetchLoginLogs, updateUserProfile, changePassword, startMfaSetup, confirmMfaSetup } from '../api/user';
import { QRCodeSVG } from 'qrcode.react';

const tabs = ['Overview', 'Security', 'Login History', 'Notifications'] as const;
type Tab = typeof tabs[number];

const permissionLabels: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Dashboard', icon: '📊' },
  view: { label: 'Market View', icon: '📈' },
  indicator: { label: 'Indicators', icon: '🔧' },
  backtest: { label: 'Backtesting', icon: '⏱️' },
  strategy: { label: 'Strategies', icon: '🤖' },
  portfolio: { label: 'Portfolio', icon: '💼' },
  settings: { label: 'Settings', icon: '⚙️' },
  user_manage: { label: 'User Management', icon: '👥' },
  credentials: { label: 'Credentials', icon: '🔑' },
};

export const UserProfileView: React.FC = () => {
  const { user, isMfaEnabled, toggleMfa } = useAuthStore() as any;
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', email: '', timezone: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [notificationForm, setNotificationForm] = useState({
    default_channels: [] as string[],
    telegram_chat_id: '',
    telegram_bot_token: '',
    whatsapp: '',
    whatsapp_token: '',
    whatsapp_phone_number_id: '',
  });
  const [notifSaveStatus, setNotifSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pwdError, setPwdError] = useState('');

  const [mfaData, setMfaData] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStatus, setMfaStatus] = useState<'idle' | 'loading' | 'pending' | 'confirming' | 'enabled' | 'error'>('idle');
  const [mfaError, setMfaError] = useState('');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    onSuccess: (data: any) => {
      setEditForm({ nickname: data.nickname || '', email: data.email || '', timezone: data.timezone || '' });
      setNotificationForm({
        default_channels: data.notification_settings?.default_channels || [],
        telegram_chat_id: data.notification_settings?.telegram_chat_id || '',
        telegram_bot_token: data.notification_settings?.telegram_bot_token || '',
        whatsapp: data.notification_settings?.whatsapp || '',
        whatsapp_token: data.notification_settings?.whatsapp_token || '',
        whatsapp_phone_number_id: data.notification_settings?.whatsapp_phone_number_id || '',
      });
    }
  } as any);

  const { data: loginLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['loginLogs'],
    queryFn: () => fetchLoginLogs(1, 20),
    enabled: activeTab === 'Login History',
  });

  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      setSaveStatus('saved');
      setEditing(false);
      refetch();
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => setSaveStatus('error'),
  });

  const handleSave = () => {
      setSaveStatus('saving');
      updateMutation.mutate(editForm);
  };

  const handleSaveNotifications = () => {
    setNotifSaveStatus('saving');
    updateMutation.mutate({ notification_settings: notificationForm }, {
      onSuccess: () => setNotifSaveStatus('saved'),
      onError: () => setNotifSaveStatus('error')
    });
  };

  const handleUpdatePassword = async () => {
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError('Passwords do not match');
      return;
    }
    setPwdStatus('saving');
    setPwdError('');
    try {
      const res = await changePassword(pwdForm.old_password, pwdForm.new_password);
      if (res.code === 1) {
        setPwdStatus('saved');
        setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        setPwdStatus('error');
        setPwdError(res.msg || 'Failed to update password');
      }
    } catch (e: any) {
      setPwdStatus('error');
      setPwdError(e.response?.data?.msg || 'An error occurred');
    }
    setTimeout(() => setPwdStatus('idle'), 3000);
  };

  const handleSetup2FA = async () => {
    setMfaStatus('loading');
    setMfaError('');
    try {
      const res = await startMfaSetup();
      if (res.code === 1) {
        setMfaData(res.data);
        setMfaStatus('pending');
      } else {
        setMfaStatus('error');
        setMfaError(res.msg || 'Failed to start 2FA setup');
      }
    } catch (e: any) {
      setMfaStatus('error');
      setMfaError(e.response?.data?.msg || 'An error occurred');
    }
  };

  const handleConfirm2FA = async () => {
    setMfaStatus('confirming');
    setMfaError('');
    try {
      const res = await confirmMfaSetup(mfaCode);
      if (res.code === 1) {
        setMfaStatus('enabled');
        setMfaData(null);
        setMfaCode('');
      } else {
        setMfaStatus('pending');
        setMfaError(res.msg || 'Failed to confirm 2FA');
      }
    } catch (e: any) {
      setMfaStatus('pending');
      setMfaError(e.response?.data?.msg || 'An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse max-w-4xl mx-auto w-full space-y-6">
        <div className="h-32 bg-gray-800 rounded-xl" />
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const lastLogin = profile.last_login_at ? new Date(profile.last_login_at).toLocaleString('en-IN') : '—';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-800/40 rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {(profile.username || 'U')[0].toUpperCase()}
            </div>
            {profile.billing?.is_vip && (
              <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">VIP</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{profile.nickname || profile.username}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/50 text-blue-300 border border-blue-700">
                @{profile.username}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                profile.role === 'admin'
                  ? 'bg-purple-900/40 text-purple-300 border-purple-700'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {profile.role}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                profile.status === 'active'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-red-900/30 text-red-400 border-red-800'
              }`}>
                {profile.status}
              </span>
            </div>
            <p className="text-gray-400 mt-1 text-sm">{profile.email}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>📅 Joined {joinDate}</span>
              <span>🕐 Last login: {lastLogin}</span>
              {profile.timezone && <span>🌍 {profile.timezone}</span>}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-bold text-white">{profile.credits || '0.00'}</div>
            <div className="text-xs text-gray-500">Credits</div>
            <div className={`text-xs mt-1 ${profile.billing?.is_vip ? 'text-amber-400' : 'text-gray-600'}`}>
              {profile.billing?.is_vip ? '⭐ VIP Active' : 'Free Plan'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Profile */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Profile Information</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-blue-400 hover:text-blue-300 text-sm border border-blue-800 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-all">
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 transition-all">Cancel</button>
                  <button onClick={handleSave} disabled={saveStatus === 'saving'} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-60">
                    {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {saveStatus === 'saved' && <div className="mb-3 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">✓ Profile updated successfully</div>}
            {saveStatus === 'error' && <div className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">✗ Failed to update profile</div>}
            <div className="space-y-4">
              {[
                { label: 'Display Name', key: 'nickname', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Timezone', key: 'timezone', type: 'text', placeholder: 'e.g. Asia/Kolkata' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  {editing ? (
                    <input
                      type={type}
                      value={(editForm as any)[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  ) : (
                    <div className="text-sm text-white">{(profile as any)[key] || <span className="text-gray-600">Not set</span>}</div>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                <div className="text-sm text-gray-400 font-mono">{profile.username}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Member Since</label>
                <div className="text-sm text-white">{joinDate}</div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Permissions</h3>
            <div className="grid grid-cols-1 gap-2">
              {(profile.permissions || []).map(perm => {
                const meta = permissionLabels[perm] || { label: perm, icon: '✓' };
                return (
                  <div key={perm} className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-sm text-gray-200 font-medium">{meta.label}</span>
                    <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Billing */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 lg:col-span-2">
            <h3 className="text-white font-semibold mb-4">Billing & Credits</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Credits', value: profile.billing?.credits?.toFixed(2) || '0.00', color: 'text-blue-400' },
                { label: 'VIP Status', value: profile.billing?.is_vip ? 'Active' : 'Inactive', color: profile.billing?.is_vip ? 'text-amber-400' : 'text-gray-400' },
                { label: 'Lifetime Plan', value: profile.billing?.is_lifetime ? 'Yes' : 'No', color: profile.billing?.is_lifetime ? 'text-green-400' : 'text-gray-400' },
                { label: 'Billing', value: profile.billing?.billing_enabled ? 'Enabled' : 'Disabled', color: profile.billing?.billing_enabled ? 'text-green-400' : 'text-gray-500' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            {profile.billing?.feature_costs && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature Costs (Credits)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(profile.billing.feature_costs).map(([feat, cost]) => (
                    <div key={feat} className="flex items-center justify-between px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-800">
                      <span className="text-xs text-gray-400 capitalize">{feat.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-blue-400">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'Security' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-6">
          <h3 className="text-white font-semibold">Security Settings</h3>
          {/* Change Password */}
          <div className="border border-gray-800 rounded-xl p-5">
            <h4 className="text-white font-medium mb-1">Change Password</h4>
            <p className="text-gray-500 text-sm mb-4">Update your account password</p>
            {pwdStatus === 'saved' && <div className="mb-4 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">✓ Password updated successfully</div>}
            {pwdError && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">✗ {pwdError}</div>}
            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                <input type="password" value={pwdForm.old_password} onChange={e => setPwdForm({ ...pwdForm, old_password: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input type="password" value={pwdForm.new_password} onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
                <input type="password" value={pwdForm.confirm_password} onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <button 
                onClick={handleUpdatePassword} 
                disabled={pwdStatus === 'saving' || !pwdForm.old_password || !pwdForm.new_password}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {pwdStatus === 'saving' ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
          {/* 2FA */}
          <div className="border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                <p className="text-gray-500 text-sm mt-1">Add an extra layer of security to your account</p>
              </div>
              <button 
                onClick={handleSetup2FA} 
                disabled={mfaStatus === 'loading' || mfaStatus === 'pending' || mfaStatus === 'confirming' || mfaStatus === 'enabled'}
                className="px-4 py-2 border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-white rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {mfaStatus === 'loading' ? 'Setting up...' : mfaStatus === 'enabled' ? '✓ Enabled' : mfaStatus === 'pending' || mfaStatus === 'confirming' ? 'Verifying...' : 'Setup 2FA'}
              </button>
            </div>
            
            {mfaError && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">✗ {mfaError}</div>}
            
            {mfaData && mfaStatus !== 'enabled' && (
              <div className="mt-4 p-4 border border-blue-800/40 bg-blue-900/10 rounded-xl max-w-md">
                <p className="text-sm text-gray-300 mb-3">1. Scan this QR code with your Authenticator app (Google Authenticator, Authy, etc).</p>
                <div className="bg-white p-3 rounded-xl inline-block mb-4 shadow-lg">
                  {mfaData.qr_image ? (
                    <img src={mfaData.qr_image} alt="2FA QR Code" width={160} height={160} />
                  ) : mfaData.otpauth_uri ? (
                    <QRCodeSVG value={mfaData.otpauth_uri} size={160} />
                  ) : null}
                </div>
                {mfaData.secret && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Or enter this secret key manually:</p>
                    <p className="text-xs text-amber-400 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 font-mono tracking-widest break-all">{mfaData.secret}</p>
                  </div>
                )}
                
                <p className="text-sm text-gray-300 mb-2">2. Enter the 6-digit code from your app to confirm.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={mfaCode} 
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} 
                    className="flex-1 bg-gray-900 border border-gray-700 text-white font-mono tracking-widest text-center text-lg rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" 
                    placeholder="000000" 
                    autoComplete="one-time-code"
                  />
                  <button 
                    onClick={handleConfirm2FA}
                    disabled={mfaStatus === 'confirming' || mfaCode.length !== 6}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {mfaStatus === 'confirming' ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}
            
            {mfaStatus === 'enabled' && (
              <div className="mt-2 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
                ✓ Two-Factor Authentication is successfully enabled!
              </div>
            )}
          </div>
          {/* Sessions */}
          <div className="border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Active Sessions</h4>
                <p className="text-gray-500 text-sm mt-1">Manage devices logged into your account</p>
              </div>
              <button className="px-4 py-2 border border-red-800 text-red-400 hover:bg-red-900/20 rounded-lg text-sm transition-all">Revoke All</button>
            </div>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === 'Login History' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Login History</h3>
            <p className="text-gray-500 text-xs mt-1">Recent account access activity</p>
          </div>
          {logsLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading logs...</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {(loginLogs || []).length === 0 ? (
                <div className="p-12 text-center text-gray-600">No login history</div>
              ) : (
                (loginLogs || []).map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${log.action === 'login_success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {log.action === 'login_success' ? '✓' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{log.action === 'login_success' ? 'Successful Login' : log.action}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>📍 {log.ip_address}</span>
                        {log.device && <span>💻 {log.device}</span>}
                        {log.location && <span>🌍 {log.location}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0">
                      {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {log.is_new_device && <div className="text-amber-400 mt-0.5">New device</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'Notifications' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Notification Channels</h3>
              <button onClick={handleSaveNotifications} disabled={notifSaveStatus === 'saving'} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition-all disabled:opacity-60">
                {notifSaveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            {notifSaveStatus === 'saved' && <div className="mb-4 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">✓ Notification settings updated</div>}
            
            <div className="space-y-4">
              {[
                { label: 'Browser Notifications', key: 'browser', desc: 'Show notifications in your browser' },
                { label: 'Email Alerts', key: 'email', desc: 'Receive alerts via email' },
                { label: 'Telegram Alerts', key: 'telegram', desc: 'Send alerts to your Telegram' },
                { label: 'WhatsApp Alerts', key: 'whatsapp', desc: 'Send alerts to WhatsApp' },
              ].map(item => {
                const enabled = notificationForm.default_channels.includes(item.key);
                return (
                  <div key={item.key} className="flex items-center justify-between p-4 border border-gray-800 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                    <button 
                      onClick={() => {
                        setNotificationForm(prev => ({
                          ...prev,
                          default_channels: enabled 
                            ? prev.default_channels.filter(c => c !== item.key)
                            : [...prev.default_channels, item.key]
                        }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-white font-semibold mb-4">Telegram Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bot Token</label>
                <input type="password" value={notificationForm.telegram_bot_token} onChange={e => setNotificationForm(f => ({ ...f, telegram_bot_token: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Chat ID</label>
                <input type="text" value={notificationForm.telegram_chat_id} onChange={e => setNotificationForm(f => ({ ...f, telegram_chat_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="-1001234567890" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-white font-semibold mb-4">WhatsApp Configuration (Meta Cloud API)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Permanent Access Token</label>
                <input type="password" value={notificationForm.whatsapp_token} onChange={e => setNotificationForm(f => ({ ...f, whatsapp_token: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="EAABw..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number ID</label>
                <input type="text" value={notificationForm.whatsapp_phone_number_id} onChange={e => setNotificationForm(f => ({ ...f, whatsapp_phone_number_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="1029384756" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Target Phone Number</label>
                <input type="text" value={notificationForm.whatsapp} onChange={e => setNotificationForm(f => ({ ...f, whatsapp: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="+1234567890" />
                <p className="text-xs text-gray-500 mt-1">Number to send the alerts to (include country code).</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
