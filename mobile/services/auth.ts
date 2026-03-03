import api from './api';
import { clearTokens, setTokens } from './token-manager';

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
  requires_verification: boolean;
  user?: UserResponse;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  mfa_enabled: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean;
}

export interface AuthMessage {
  message: string;
  success: boolean;
  requires_verification: boolean;
}

type LoginResult = LoginResponse | MFAChallengeResponse;

function isMFA(result: LoginResult): result is MFAChallengeResponse {
  return 'mfa_required' in result && result.mfa_required === true;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await api.post<LoginResult>('/api/v1/auth/login', {
      email,
      password,
    });
    if (!isMFA(data)) {
      await setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  async loginMfa(
    challengeToken: string,
    totpCode: string,
  ): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/v1/auth/login/mfa', {
      challenge_token: challengeToken,
      totp_code: totpCode,
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
};

export { isMFA };
