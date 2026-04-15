import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  memberType: 'SUCCESSFUL' | 'COMPANION';
  membershipTier: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export const setToken = (token: string) => {
  Cookies.set('gc_token', token, { expires: 7, secure: true, sameSite: 'strict' });
};

export const getToken = () => Cookies.get('gc_token');

export const removeToken = () => Cookies.remove('gc_token');

export const isAuthenticated = () => !!getToken();

export const isPremium = (tier?: string) => tier && tier !== 'FREE';