import { Platform } from 'react-native';
import api from './api';

interface DeviceRegisterResponse {
  id: string;
  token: string;
  device_platform: string;
  device_name: string | null;
  is_active: boolean;
}

export async function registerPushToken(expoPushToken: string): Promise<DeviceRegisterResponse> {
  const { data } = await api.post<DeviceRegisterResponse>(
    '/api/v1/devices/register',
    {
      token: expoPushToken,
      device_platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: null,
    },
  );
  return data;
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete(`/api/v1/devices/${token}`);
}
