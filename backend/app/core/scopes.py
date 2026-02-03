from typing import List, Type, Any, Optional
from sqlalchemy.sql.elements import BinaryExpression
from sqlalchemy import select
from uuid import UUID

from app.db.models import User # Solo User es necesario para type hinting

def apply_scope_to_query(
    query: Any, # Esta será la consulta SQLAlchemy
    user: User,
    permission_key: str,
    entity_model: Type[Any], # Por ejemplo, Ticket o Partes
    allowed_group_ids: Optional[List[UUID]] = None, # IDs de grupo ya resueltos
    target_group_field_name: str = "owner_group_id", # Campo por defecto para filtrar por grupo
    target_user_field_name: str = "created_by_id" # Campo por defecto para filtrar por "own"
) -> Any:
    """
    Aplica filtros de scope a una consulta SQLAlchemy basándose en el usuario y el permiso.
    """
    # Si el usuario es superusuario, no aplicamos restricciones de scope
    if user.is_superuser:
        return query

    # Si el permiso es global, no aplicamos restricciones de scope
    if ":global" in permission_key:
        return query

    # Filtros basados en el scope del permiso
    if ":group" in permission_key:
        if allowed_group_ids:
            # Asegurarse de que el campo exista en el modelo
            if hasattr(entity_model, target_group_field_name):
                return query.filter(getattr(entity_model, target_group_field_name).in_(allowed_group_ids))
            else:
                # Esto debería ser un error de configuración o un permiso mal definido
                print(f"Advertencia: El modelo {entity_model.__tablename__} no tiene el campo '{target_group_field_name}' para el permiso '{permission_key}'.")
        # Si no hay allowed_group_ids, la consulta no debería devolver nada para un permiso de grupo
        return query.filter(False) # Retorna una consulta que siempre será falsa

    if ":own" in permission_key:
        # Filtra por tickets creados por el propio usuario
        if hasattr(entity_model, target_user_field_name):
            return query.filter(getattr(entity_model, target_user_field_name) == user.id)
        else:
            print(f"Advertencia: El modelo {entity_model.__tablename__} no tiene el campo '{target_user_field_name}' para el permiso '{permission_key}'.")
        return query.filter(False) # Retorna una consulta que siempre será falsa

    return query # Devuelve la consulta original si no se aplica ningún scope específico
