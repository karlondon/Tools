import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  memberType: 'MEMBER' | 'COMPANION' | 'ADMIN' | 'SUPER_ADMIN';
  membershipTier: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export const setToken = (token: string) => {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  Cookies.set('gc_token', token, { expires: 7, secure: isHttps, sameSite: 'strict' });
};

export const getToken = () => Cookies.get('gc_token');

export const removeToken = () => Cookies.remove('gc_token');

export const isAuthenticated = () => !!getToken();

export const isPremium = (tier?: string) => tier && tier !== 'FREE';

export const getUser = (): User | null => {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as User;
  } catch {
    return null;
  }
};

export const isSuperAdmin = (): boolean => {
  const user = getUser();
  return user?.memberType === 'SUPER_ADMIN';
};