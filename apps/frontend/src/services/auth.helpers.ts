import type { AuthResponseData, User } from '../types/user.types';

interface AuthPayload {
  access_token?: string;
  accessToken?: string;
  user?: User;
}

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
}

export function normalizeAuthResponse(data: AuthPayload | null | undefined): AuthResponseData {
  const accessToken = data?.access_token || data?.accessToken;

  if (!accessToken || !data?.user) {
    throw new Error('Phản hồi đăng nhập không hợp lệ từ máy chủ');
  }

  return { accessToken, user: data.user };
}

export function isAuthUnauthorizedError(error: unknown): boolean {
  return (error as ApiErrorShape | null)?.response?.status === 401;
}

export function isApiConflictError(error: unknown): boolean {
  return (error as ApiErrorShape | null)?.response?.status === 409;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape | null;
  const message = apiError?.response?.data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof apiError?.message === 'string' && apiError.message.trim()) return apiError.message;
  return fallback;
}
