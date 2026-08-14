import { apiClient } from './client';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  status: string;
  role: string;
  credits: string;
  vip_expires_at: string | null;
  timezone: string;
  last_login_at: string;
  register_ip: string;
  created_at: string;
  updated_at: string;
  permissions: string[];
  billing: {
    credits: number;
    is_vip: boolean;
    is_lifetime: boolean;
    vip_expires_at: string | null;
    billing_enabled: boolean;
    feature_costs: Record<string, number>;
  };
  notification_settings: {
    default_channels: string[];
  };
}

export interface LoginLog {
  id: number;
  action: string;
  method: string;
  ip_address: string;
  device: string;
  location: string;
  isp: string;
  is_new_device: boolean;
  is_new_region: boolean;
  created_at: string;
}

export const fetchUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/api/v1/users/profile');
  return response.data.data;
};

export const updateUserProfile = async (payload: {
  nickname?: string;
  email?: string;
  timezone?: string;
  notification_settings?: any;
}) => {
  const response = await apiClient.put('/api/v1/users/profile/update', payload);
  return response.data;
};

export const fetchLoginLogs = async (page = 1, pageSize = 20) => {
  const response = await apiClient.get(`/api/v1/users/login-logs?page=${page}&page_size=${pageSize}`);
  return response.data.data?.items || [];
};

export const fetchMyCreditsLog = async (page = 1, pageSize = 20) => {
  const response = await apiClient.get(`/api/v1/users/my-credits-log?page=${page}&page_size=${pageSize}`);
  return response.data.data?.items || [];
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const response = await apiClient.post('/api/v1/users/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const startMfaSetup = async () => {
  const response = await apiClient.post('/api/v1/users/mfa/setup/start');
  return response.data;
};

export const confirmMfaSetup = async (code: string) => {
  const response = await apiClient.post('/api/v1/users/mfa/setup/confirm', { code });
  return response.data;
};
