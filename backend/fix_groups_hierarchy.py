import asyncio
from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.db.models.group import Group

async def check_and_fix_hierarchy():
    async with AsyncSessionLocal() as db:
        # 1. Buscar el ID de la División
        result = await db.execute(select(Group).filter(Group.name == "División Seguridad Informática"))
        division = result.scalar_one_or_none()
        
        if not division:
            print("❌ No se encontró el grupo 'División Seguridad Informática'")
            return

        print(f"✅ ID de la División: {division.id}")

        # 2. Listar todos los grupos y sus padres actuales
        result = await db.execute(select(Group))
        all_groups = result.scalars().all()
        
        print("\nEstado actual:")
        print(f"{ 'Nombre':<30} | {'Parent ID':<40}")
        print("-" * 75)
        for g in all_groups:
            print(f"{g.name:<30} | {str(g.parent_id):<40}")

        # 3. Vincular los grupos "Área ..." a la División
        print("\n🔧 Corrigiendo jerarquía...")
        for g in all_groups:
            if g.name.startswith("Área") and g.parent_id is None:
                g.parent_id = division.id
                print(f"   -> Vinculando {g.name} a la División")
        
        await db.commit()
        print("\n🚀 Jerarquía actualizada en la base de datos.")

if __name__ == "__main__":
    asyncio.run(check_and_fix_hierarchy())
