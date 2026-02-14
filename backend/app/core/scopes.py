from enum import Enum

class Scopes(str, Enum):
    """
    Define los alcances (scopes) para permisos granularizados.
    """
    ADMIN = "admin"
    TICKET_READ = "ticket:read"
    TICKET_WRITE = "ticket:write"
    USER_MANAGE = "user:manage"
