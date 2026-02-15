from typing import Any, List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Query

def apply_scope_to_query(
    query: Query,
    user: Any,
    permission_key: str,
    entity_model: Any,
    allowed_group_ids: Optional[List[Any]] = None,
    target_group_field_name: str = "group_id",
    target_user_field_name: str = "created_by_id",
    target_assigned_field_name: str = "assigned_to_id"
) -> Query:
    """
    Aplica filtros de seguridad (Scopes) a una consulta de SQLAlchemy.
    Soporta lógica de Visibilidad Global, Grupo y Propia.
    """
    if hasattr(user, 'is_superuser') and user.is_superuser:
        return query

    conditions = []

    # 1. Soporte para Tickets Globales (si el modelo lo tiene)
    if hasattr(entity_model, 'is_global'):
        conditions.append(entity_model.is_global == True)

    # 2. Scope GLOBAL (si tiene el permiso explícito)
    if ":global" in permission_key:
        return query # Acceso total (salvo privacidad, que se maneja aparte)

    # 3. Scope GROUP
    if ":group" in permission_key and allowed_group_ids:
        group_field = getattr(entity_model, target_group_field_name, None)
        if group_field is not None:
            conditions.append(group_field.in_(allowed_group_ids))
        
        # También chequear owner_group_id si existe
        owner_group_field = getattr(entity_model, "owner_group_id", None)
        if owner_group_field is not None:
            conditions.append(owner_group_field.in_(allowed_group_ids))

    # 4. Scope OWN / ASSIGNED
    if ":own" in permission_key or ":assigned" in permission_key:
        user_field = getattr(entity_model, target_user_field_name, None)
        if user_field is not None:
            conditions.append(user_field == user.id)
            
        assigned_field = getattr(entity_model, target_assigned_field_name, None)
        if assigned_field is not None:
            conditions.append(assigned_field == user.id)

    if conditions:
        return query.filter(or_(*conditions))
    
    # Si no hay condiciones y no es superuser, por seguridad no devolvemos nada
    return query.filter(False)
