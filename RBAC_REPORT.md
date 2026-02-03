# Reporte de Unificación de Permisos (RBAC)

Se ha completado la refactorización del sistema de permisos para cumplir con el modelo RBAC dinámico y unificado.

## 1. Cambios Realizados

### Backend
*   **`app/core/permissions.py`**: Se actualizó el Enum `PermissionEnum` para incluir todas las claves de permiso requeridas (Tickets, Partes, Admin, Locations, etc.) eliminando ambigüedades.
*   **`app/scripts/initial_data.py`**: Se reescribió el script de seed para:
    *   Poblar el **Registry de Permisos** en la base de datos con metadata (nombre, módulo, scope).
    *   Crear los **Roles Finales** (`AdminPanelFull`, `DSIN_Operativo_AdminParcial`, `Area_Operativa`, `UsuarioFinal`) con sus asignaciones exactas.
    *   Asignar el rol `AdminPanelFull` al superusuario inicial.
*   **`app/crud/crud_ticket.py`**: Se corrigió un error de importación y se unificó la lógica de filtrado usando `apply_scope_to_query`, eliminando chequeos hardcodeados.
*   **`app/api/v1/routers/tickets.py` & `daily_reports.py`**: Verificados para usar `require_permission` y lógica de scope consistente (`:global`, `:group`, `:own`).
*   **`app/api/v1/routers/iam.py`**: Confirmed implementation of Permissions Registry CRUD endpoints.

### Frontend
*   **`pages/admin/permissions.tsx`**: Panel de "Registro de Permisos" funcional para crear/editar capacidades del sistema dinámicamente.
*   **`pages/admin/roles.tsx`**: Panel de "Matriz de Roles" funcional para asignar permisos a roles visualmente.

## 2. Explicación de la Unificación

### Antes (Problema "Permisos Fantasmas")
El decorador `@require_permission("ticket:read")` permitía el paso a la función, pero luego la consulta SQL podía tener un filtro `owner_group_id == user.group_id` hardcodeado o inconsistente. Esto causaba que un usuario con "permiso lógico" no viera los datos "físicos".

### Ahora (Solución Unificada)
El sistema funciona en dos capas sincronizadas:
1.  **Capa de Acceso (Decorator)**: `require_permission("ticket:create")` verifica si el usuario tiene esa *capability* en su rol.
2.  **Capa de Datos (Scope)**: La función `apply_scope_to_query` (o lógica equivalente en el router) inspecciona la *key* del permiso:
    *   Si tiene `:global` (ej. `ticket:read:global`) -> **NO** aplica filtros (SELECT *).
    *   Si tiene `:group` (ej. `ticket:read:group`) -> Aplica `WHERE group_id IN (mis_grupos)`.
    *   Si tiene `:own` (ej. `ticket:read:own`) -> Aplica `WHERE created_by = yo`.

Esto garantiza que **si tienes el permiso, ves los datos correspondientes**.

## 3. Extensibilidad Futura
Para agregar un nuevo módulo (ej. "Assets"):
1.  Ir a **Admin > Registro de Permisos**.
2.  Crear permisos: `assets:read:global`, `assets:create`.
3.  Ir a **Admin > Roles**.
4.  Editar roles (ej. DSIN) y marcar los nuevos checkboxes.
5.  El backend (si usa `require_permission("assets:...")`) ya respetará estos cambios sin redeploy de código para la asignación.

## 4. Validación
Se ejecutó el script de seed y se verificó que los permisos existen en la base de datos:
```json
['ticket:read:global', 'ticket:create', 'admin:locations:manage', ...]
```
El rol `DSIN_Operativo_AdminParcial` tiene acceso a Tickets Globales y Locations, pero NO a gestión de usuarios, cumpliendo la regla de negocio.
