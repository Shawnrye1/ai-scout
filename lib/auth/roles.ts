// User roles and permissions for AI Scout
export type UserRole = 'admin' | 'coach' | 'assistant_coach' | 'player' | 'member';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  coach: 80,
  assistant_coach: 60,
  player: 40,
  member: 20,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  player: 'Player',
  member: 'Member',
};

// Permissions by role
export const PERMISSIONS = {
  // Game management
  'games:create': ['admin', 'coach'],
  'games:read': ['admin', 'coach', 'assistant_coach', 'player'],
  'games:update': ['admin', 'coach'],
  'games:delete': ['admin', 'coach'],
  'games:process': ['admin', 'coach'],

  // Player reports
  'reports:read': ['admin', 'coach', 'assistant_coach', 'player'],
  'reports:read_all': ['admin', 'coach', 'assistant_coach'],
  'reports:read_own': ['player'], // Players can only see their own

  // Team management
  'team:manage': ['admin', 'coach'],
  'team:invite': ['admin', 'coach', 'assistant_coach'],
  'team:view': ['admin', 'coach', 'assistant_coach', 'player'],

  // Admin features
  'admin:access': ['admin'],
  'admin:corrections': ['admin', 'coach'],
  'admin:models': ['admin'],
  'admin:settings': ['admin'],

  // Billing
  'billing:view': ['admin', 'coach'],
  'billing:manage': ['admin', 'coach'],

  // Flagging/corrections
  'flag:create': ['admin', 'coach', 'assistant_coach'],
  'flag:review': ['admin', 'coach'],

  // Analytics
  'analytics:team': ['admin', 'coach', 'assistant_coach'],
  'analytics:player': ['admin', 'coach', 'assistant_coach', 'player'],
  'analytics:advanced': ['admin', 'coach'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

// Check if a role is at least as high as another
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly string[]][])
    .filter(([_, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

// For auto-assigning admin role
export const ADMIN_EMAILS = [
  'shawnrearl@icloud.com',
];

export function getDefaultRoleForEmail(email: string): UserRole {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return 'admin';
  }
  return 'coach'; // Default new signups to coach
}
