from enum import Enum

class PermissionEnum(str, Enum):
    # --- TICKETS ---
    TICKET_READ_GLOBAL = "ticket:read:global"
    TICKET_READ_GROUP = "ticket:read:group"
    TICKET_READ_OWN = "ticket:read:own"
    TICKET_CREATE = "ticket:create"
    TICKET_UPDATE_OWN = "ticket:update:own"
    TICKET_UPDATE_ASSIGNED = "ticket:update:assigned"
    TICKET_ASSIGN_GROUP = "ticket:assign:group"
    TICKET_CLOSE_GROUP = "ticket:close:group"
    TICKET_COMMENT_GLOBAL = "ticket:comment:global"
    TICKET_COMMENT_GROUP = "ticket:comment:group"
    TICKET_COMMENT_OWN = "ticket:comment:own"
    TICKET_WATCH_GLOBAL = "ticket:watch:global"
    TICKET_WATCH_GROUP = "ticket:watch:group"
    TICKET_WATCH_OWN = "ticket:watch:own"
    
    # --- PARTES ---
    PARTES_READ_GLOBAL = "partes:read:global"
    PARTES_READ_GROUP = "partes:read:group"
    PARTES_CREATE = "partes:create"
    PARTES_UPDATE_OWN = "partes:update:own"

    # --- ADMIN PANEL ---
    ADMIN_ACCESS = "admin:access"
    ADMIN_USERS_READ = "admin:users:read"
    ADMIN_USERS_MANAGE = "admin:users:manage"
    ADMIN_ROLES_READ = "admin:roles:read"
    ADMIN_ROLES_MANAGE = "admin:roles:manage"
    ADMIN_GROUPS_READ = "admin:groups:read"
    ADMIN_GROUPS_MANAGE = "admin:groups:manage"
    ADMIN_CATALOGS_READ = "admin:catalogs:read"
    ADMIN_CATALOGS_MANAGE = "admin:catalogs:manage"
    ADMIN_SETTINGS_READ = "admin:settings:read"
    ADMIN_SETTINGS_MANAGE = "admin:settings:manage"
    
    # --- UBICACIONES ---
    ADMIN_LOCATIONS_READ = "admin:locations:read"
    ADMIN_LOCATIONS_MANAGE = "admin:locations:manage"

    # --- FORENSICS (EML) ---
    FORENSICS_EML_SCAN = "forensics:eml:scan"

    # --- DASHBOARD & REPORTS (Extras) ---
    DASHBOARD_VIEW = "dashboard:view"
    REPORT_VIEW = "report:view"
    AUDIT_READ = "audit:read"

    # --- SIEM ---
    SIEM_VIEW = "siem:view"
    SIEM_MANAGE = "siem:manage" # Gestión total (ack, promote, settings)
    
    # --- ASSETS ---
    ASSETS_READ_GLOBAL = "assets:read:global"
    ASSETS_READ_GROUP = "assets:read:group"
    ASSETS_MANAGE_GLOBAL = "assets:manage:global"
    ASSETS_MANAGE_GROUP = "assets:manage:group"
    ASSETS_IMPORT = "assets:import"
    ASSETS_INSTALL = "assets:install"
    ASSETS_DELETE = "assets:delete"
    
    # --- PARTES (Gestión Avanzada) ---
    PARTES_MANAGE = "partes:manage" # Eliminar, editar cualquiera, etc.

ALL_PERMISSIONS = [p.value for p in PermissionEnum]
