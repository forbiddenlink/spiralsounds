/**
 * Role-Based Access Control (RBAC) System
 * 
 * This system provides flexible role and permission management
 * with database-backed storage and middleware for route protection.
 */

import { userRepository } from '../repositories/index.js'
import { AuthorizationError, NotFoundError } from '../utils/errors.js'
import { logger } from '../middleware/errorHandler.js'

// Define system roles and their hierarchy
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
}

// Define system permissions
export const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  
  // Product management
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_LIST: 'product:list',
  
  // Order management
  ORDER_CREATE: 'order:create',
  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_LIST: 'order:list',
  ORDER_MANAGE_ALL: 'order:manage_all',
  
  // Analytics access
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // System administration
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup'
}

// Role-Permission mappings
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  
  [ROLES.ADMIN]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.PRODUCT_LIST,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDER_LIST,
    PERMISSIONS.ORDER_MANAGE_ALL,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT
  ],
  
  [ROLES.MODERATOR]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_LIST,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  
  [ROLES.USER]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_LIST,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ // Own orders only
  ],
  
  [ROLES.GUEST]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_LIST
  ]
}

/**
 * RBAC Service class for managing roles and permissions
 */
export class RBACService {
  
  /**
   * Get user's role from database
   */
  static async getUserRole(userId) {
    try {
      const user = await userRepository.findById(userId)
      if (!user) {
        throw new NotFoundError('User', userId)
      }
      
      // Default to 'user' role if no role is set
      return user.role || ROLES.USER
    } catch (error) {
      logger.error('Failed to get user role:', error)
      throw error
    }
  }

  /**
   * Get permissions for a specific role
   */
  static getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if a role has a specific permission
   */
  static roleHasPermission(role, permission) {
    const permissions = this.getRolePermissions(role)
    return permissions.includes(permission)
  }

  /**
   * Check if user has a specific permission
   */
  static async userHasPermission(userId, permission) {
    try {
      const userRole = await this.getUserRole(userId)
      return this.roleHasPermission(userRole, permission)
    } catch (error) {
      logger.error('Failed to check user permission:', error)
      return false
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(userId, role) {
    try {
      if (!Object.values(ROLES).includes(role)) {
        throw new ValidationError(`Invalid role: ${role}`)
      }

      await userRepository.updateById(userId, {
        role,
        updated_at: new Date().toISOString()
      })

      logger.info(`Role ${role} assigned to user ${userId}`)
      return true
    } catch (error) {
      logger.error('Failed to assign role:', error)
      throw error
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role, limit = 50, offset = 0) {
    try {
      return await userRepository.findWhere('role = ?', [role], limit, offset)
    } catch (error) {
      logger.error('Failed to get users by role:', error)
      throw error
    }
  }

  /**
   * Check role hierarchy (higher roles can manage lower roles)
   */
  static canManageRole(managerRole, targetRole) {
    const hierarchy = [
      ROLES.GUEST,
      ROLES.USER, 
      ROLES.MODERATOR,
      ROLES.ADMIN,
      ROLES.SUPER_ADMIN
    ]
    
    const managerLevel = hierarchy.indexOf(managerRole)
    const targetLevel = hierarchy.indexOf(targetRole)
    
    return managerLevel > targetLevel
  }

  /**
   * Validate permission access with context
   */
  static async validateAccess(userId, permission, context = {}) {
    try {
      const hasPermission = await this.userHasPermission(userId, permission)
      
      if (!hasPermission) {
        throw new AuthorizationError(`Permission denied: ${permission}`)
      }

      // Additional context-based validation
      if (context.resourceOwnerId && permission.includes(':read')) {
        // Users can read their own resources
        if (userId === context.resourceOwnerId) {
          return true
        }
        
        // Check if user has permission to read others' resources
        const userRole = await this.getUserRole(userId)
        if (!this.roleHasPermission(userRole, permission.replace(':read', ':manage_all'))) {
          throw new AuthorizationError('Permission denied: Cannot access other users\' resources')
        }
      }

      return true
    } catch (error) {
      logger.warn('Access validation failed:', { userId, permission, context, error: error.message })
      throw error
    }
  }
}

/**
 * Middleware factory for protecting routes with specific permissions
 */
export const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthorizationError('Authentication required')
      }

      await RBACService.validateAccess(req.user.userId, permission, {
        resourceOwnerId: options.getResourceOwnerId ? options.getResourceOwnerId(req) : null,
        ...options.context
      })

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware factory for protecting routes with specific roles
 */
export const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthorizationError('Authentication required')
      }

      const userRole = await RBACService.getUserRole(req.user.userId)
      
      if (userRole !== requiredRole) {
        throw new AuthorizationError(`Role '${requiredRole}' required`)
      }

      req.userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware for checking minimum role level
 */
export const requireMinRole = (minRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthorizationError('Authentication required')
      }

      const userRole = await RBACService.getUserRole(req.user.userId)
      
      const hierarchy = [ROLES.GUEST, ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]
      const userLevel = hierarchy.indexOf(userRole)
      const minLevel = hierarchy.indexOf(minRole)
      
      if (userLevel < minLevel) {
        throw new AuthorizationError(`Minimum role '${minRole}' required`)
      }

      req.userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Admin-only middleware (shortcut for admin+ roles)
 */
export const requireAdmin = requireMinRole(ROLES.ADMIN)

/**
 * Moderator+ middleware (shortcut for moderator+ roles)
 */
export const requireModerator = requireMinRole(ROLES.MODERATOR)