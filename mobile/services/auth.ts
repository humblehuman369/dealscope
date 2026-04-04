import api from './api';
import { clearTokens, setTokens } from './token-manager';

// ------------------------------------------------------------------
// Types — kept in sync with frontend/src/lib/api-client.ts
// ------------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  mfa_enabled: boolean;
  created_at: string;
  last_login: string | null;
  has_profile: boolean;
  onboarding_completed: boolean;
  roles: string[];
  permissions: string[];
  subscription_tier: 'free' | 'pro';
  subscription_status: string;
}

export interface LoginResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface MFAChallengeResponse {
  mfa_required: true;
  challenge_token: string;
}

export interface RegisterResponse {
  message: string;
  requires_verification?: boolean;
  user?: UserResponse;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface AuthMessage {
  message: string;
}

export interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface MFASetupResponse {
  secret: string;
  provisioning_uri: string;
}

type LoginResult = LoginResponse | MFAChallengeResponse;

function isMFA(result: LoginResult): result is MFAChallengeResponse {
  return 'mfa_required' in result && result.mfa_required === true;
}

export const authApi = {
  async login(
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<LoginResult> {
    const { data } = await api.post<LoginResult>('/api/v1/auth/login', {
      email,
      password,
      remember_me: rememberMe,
    });
    if (!isMFA(data)) {
      await setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  async loginMfa(
    challengeToken: string,
    totpCode: string,
    rememberMe = false,
  ): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/v1/auth/login/mfa', {
      challenge_token: challengeToken,
      totp_code: totpCode,
      remember_me: rememberMe,
    });
    await setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>(
      '/api/v1/auth/register',
      { email, password, full_name: fullName },
    );
    if (data.access_token && data.refresh_token) {
      await setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  async me(): Promise<UserResponse> {
    const { data } = await api.get<UserResponse>('/api/v1/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      await clearTokens();
    }
  },

  async forgotPassword(email: string): Promise<AuthMessage> {
    const { data } = await api.post<AuthMessage>(
      '/api/v1/auth/forgot-password',
      { email },
    );
    return data;
  },

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<AuthMessage> {
    const { data } = await api.post<AuthMessage>(
      '/api/v1/auth/reset-password',
      { token, new_password: newPassword },
    );
    return data;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthMessage> {
    const { data } = await api.post<AuthMessage>(
      '/api/v1/auth/change-password',
      { current_password: currentPassword, new_password: newPassword },
    );
    return data;
  },

  async verifyEmail(token: string): Promise<AuthMessage> {
    const { data } = await api.post<AuthMessage>(
      '/api/v1/auth/verify-email',
      { token },
    );
    return data;
  },

  async listSessions(): Promise<SessionInfo[]> {
    const { data } = await api.get<SessionInfo[]>('/api/v1/auth/sessions');
    return data;
  },

  async revokeSession(sessionId: string): Promise<AuthMessage> {
    const { data } = await api.delete<AuthMessage>(
      `/api/v1/auth/sessions/${sessionId}`,
    );
    return data;
  },

  async setupMfa(): Promise<MFASetupResponse> {
    const { data } = await api.post<MFASetupResponse>(
      '/api/v1/auth/mfa/setup',
    );
    return data;
  },

  async verifyMfa(totpCode: string): Promise<AuthMessage> {
    const { data } = await api.post<AuthMessage>('/api/v1/auth/mfa/verify', {
      totp_code: totpCode,
    });
    return data;
  },

  async disableMfa(): Promise<AuthMessage> {
    const { data } = await api.delete<AuthMessage>('/api/v1/auth/mfa');
    return data;
  },

  async deleteAccount(): Promise<AuthMessage> {
    const { data } = await api.delete<AuthMessage>('/api/v1/users/me');
    await clearTokens();
    return data;
  },
};

export { isMFA };
