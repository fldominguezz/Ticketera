import asyncio
import logging
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user
from app.schemas.user import UserCreate
from app.db.models.iam import Role, UserRole

# Configuración de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

users_to_create = [
    {"full_name": "ADRIAN JESÚS gauna", "email": "gaunaadrianjesus@gmail.com"},
    {"full_name": "ALAN LUCIANO LORU", "email": "alanlucianoloru@gmail.com"},
    {"full_name": "ALFREDO AGUIRRE IVÁN", "email": "ivan.alfredo.aguirre@gmail.com"},
    {"full_name": "ARMANDO JOSE PEREYRA", "email": "apereyra@policiafederal.gov.ar"},
    {"full_name": "Agustina Legal", "email": "alegal@policiafederal.gov.ar"},
    {"full_name": "Alejandro Pedrozo", "email": "apedrozo@policiafederal.gov.ar"},
    {"full_name": "Brian Marconi", "email": "bmarconi@policiafederal.gov.ar"},
    {"full_name": "Carolina Del Carmen SBAGLIA", "email": "carolasbaglia@hotmail.com"},
    {"full_name": "DANIEL ALBERTO PECI", "email": "dpeci@policiafederal.gov.ar"},
    {"full_name": "DIEGO HERNAN VITUZZI", "email": "dvituzzi@policiafederal.gov.ar"},
    {"full_name": "EDUARDO FERNANDO acosta", "email": "eduyfer@hotmail.com"},
    {"full_name": "EZEQUIEL SOLOAGA", "email": "esoloaga@policiafederal.gov.ar"},
    {"full_name": "Ezequiel Simon Amarfil Molina", "email": "eamarfil@policiafederal.gov.ar"},
    {"full_name": "Facundo Verbauwede", "email": "fverbauwede@policiafederal.gov.ar"},
    {"full_name": "Fernando Lucio Dominguez", "email": "fldominguezz@gmail.com"},
    {"full_name": "Florencia Fuentes", "email": "ffuentes@policiafederal.gov.ar"},
    {"full_name": "Florencia Maria Fuentes", "email": "ffuentes2@policiafederal.gov.ar"},
    {"full_name": "GASTÓN EZEQUIEL SPALLA", "email": "gspalla@policiafederal.gov.ar"},
    {"full_name": "GONZALO GABRIEL CARBALLO", "email": "gcarballo@policiafederal.gov.ar"},
    {"full_name": "Hector Manuel MORENO", "email": "hmoreno@policiafederal.gov.ar"},
    {"full_name": "IVAN EZEQUIEL sanchez", "email": "ivansanchez94.is@gmail.com"},
    {"full_name": "Jonathan Peix", "email": "jpeix@policiafederal.gov.ar"},
    {"full_name": "Jose LIMPE", "email": "jlimpe@policiafederal.gov.ar"},
    {"full_name": "Juana Rebeca Zarate", "email": "jzarate@policiafederal.gov.ar"},
    {"full_name": "Julian FERNANDEZ", "email": "jfernandez@policiafederal.gov.ar"},
    {"full_name": "MARCOS DAMIÁN ROBIN", "email": "mrobin@policiafederal.gov.ar"},
    {"full_name": "Maria Nancy Dominguez", "email": "mdominguez@policiafederal.gov.ar"},
    {"full_name": "Marisa Andrea Fontan", "email": "mfontan@policiafederal.gov.ar"},
    {"full_name": "Nahir Araceli Ledesma", "email": "nledesma@policiafederal.gov.ar"},
    {"full_name": "PABLO NICOLÁS VEGA MEDINA", "email": "pvega@policiafederal.gov.ar"},
    {"full_name": "Ricardo Angel Ruiz", "email": "rruiz@policiafederal.gov.ar"},
    {"full_name": "Victoria Ramirez", "email": "vramirez@policiafederal.gov.ar"},
    {"full_name": "Yesica Becerra", "email": "ybecerra@policiafederal.gov.ar"},
]

async def seed_users():
    async with AsyncSessionLocal() as db:
        # Obtener el rol de Tickets
        result = await db.execute(select(Role).where(Role.name == "Tickets"))
        role = result.scalars().first()
        
        if not role:
            # Listar roles disponibles para ayudar al usuario si falla
            result_all = await db.execute(select(Role.name))
            available_roles = result_all.scalars().all()
            logger.error(f"No se encontró el rol 'Tickets'. Roles disponibles: {available_roles}")
            return

        for user_data in users_to_create:
            parts = user_data["full_name"].split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
            
            existing_user = await crud_user.get_by_email(db, email=user_data["email"])
            if existing_user:
                logger.info(f"Usuario ya existe: {user_data['email']}")
                continue
            
            new_user = UserCreate(
                username=user_data["email"].split("@")[0],
                email=user_data["email"],
                first_name=first_name,
                last_name=last_name,
                password="PFATicketera2026!",
                force_password_change=True
            )
            
            try:
                db_user = await crud_user.create(db, obj_in=new_user)
                # Asignar el rol manualmente a la tabla user_roles
                user_role = UserRole(user_id=db_user.id, role_id=role.id)
                db.add(user_role)
                logger.info(f"Usuario creado con rol Tickets: {user_data['email']}")
            except Exception as e:
                logger.error(f"Error creando usuario {user_data['email']}: {e}")
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(seed_users())
