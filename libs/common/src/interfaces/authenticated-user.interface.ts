export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}
