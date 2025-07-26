// Database model (snake_case)
export type UserDTO = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  google_avatar_url: string | null;
  avatar_filename: string | null;
  role: "user" | "admin";
  auth_provider: "local" | "google";
  provider_id: string | null;
  is_verified: boolean;
  is_online: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  created_at: string;
  updated_at: string;
};

// Application model (camelCase)
export type User = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  googleAvatarUrl: string | null;
  avatarFilename: string | null;
  role: "user" | "admin";
  authProvider: "local" | "google";
  providerId: string | null;
  isVerified: boolean;
  isOnline: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  createdAt: string;
  updatedAt: string;
};

// For API responses (excludes sensitive data)
export type PublicUser = Omit<User, "twoFactorSecret" | "password">;

// For authentication responses
export type AuthUser = Omit<PublicUser, "createdAt" | "updatedAt"> & {
  requiresTwoFactor?: boolean;
};

// For user creation/updates
export type CreateUser = Pick<
  User,
  | "firstName"
  | "lastName"
  | "username"
  | "displayName"
  | "email"
  | "password"
  | "twoFactorEnabled"
>;

export function mapUserDTOToUser(dto: UserDTO): User {
  return {
    id: dto.id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    username: dto.username,
    displayName: dto.display_name,
    email: dto.email,
    password: dto.password_hash,
    avatarFilename: dto.avatar_filename,
    googleAvatarUrl: dto.google_avatar_url,
    role: dto.role,
    authProvider: dto.auth_provider,
    providerId: dto.provider_id,
    isVerified: dto.is_verified ? true : false,
    isOnline: dto.is_online ? true : false,
    twoFactorEnabled: dto.two_factor_enabled ? true : false,
    twoFactorSecret: dto.two_factor_secret,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  } as User;
}

export function mapUserDTOToPublicUser(dto: UserDTO): PublicUser {
  return {
    id: dto.id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    username: dto.username,
    displayName: dto.display_name,
    email: dto.email,
    avatarFilename: dto.avatar_filename,
    googleAvatarUrl: dto.google_avatar_url,
    role: dto.role,
    authProvider: dto.auth_provider,
    providerId: dto.provider_id,
    isVerified: dto.is_verified ? true : false,
    isOnline: dto.is_online ? true : false,
    twoFactorEnabled: dto.two_factor_enabled ? true : false,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  } as PublicUser;
}

export function mapUserToUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    display_name: user.displayName,
    email: user.email,
    password_hash: user.password,
    google_avatar_url: user.googleAvatarUrl,
    avatar_filename: user.avatarFilename,
    role: user.role,
    auth_provider: user.authProvider,
    provider_id: user.providerId,
    is_verified: user.isVerified ? true : false,
    is_online: user.isOnline ? true : false,
    two_factor_enabled: user.twoFactorEnabled ? true : false,
    two_factor_secret: user.twoFactorSecret,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  } as UserDTO;
}
