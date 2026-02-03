# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base  # noqa
from app.db.models.user import User  # noqa
from app.db.models.ticket import Ticket  # noqa
from app.db.models.group import Group  # noqa
from app.db.models.sla import SLAPolicy, SLAMetric  # noqa
from app.db.models.workflow import Workflow, WorkflowState, WorkflowTransition  # noqa
from app.db.models.daily_report import DailyReport  # noqa
from app.db.models.asset import Asset  # noqa
from app.db.models.expediente import Expediente  # noqa
from app.db.models.location import LocationNode  # noqa
from app.db.models.endpoint import Endpoint  # noqa
from app.db.models.audit_log import AuditLog  # noqa
from app.db.models.notifications import Notification  # noqa
from app.db.models.integrations import SIEMRule, SIEMEvent  # noqa
from app.db.models.form import Form, FormSubmission  # noqa
from app.db.models.alert import Alert  # noqa
from app.db.models.plugin import Plugin  # noqa
from app.db.models.session import Session  # noqa
from app.db.models.password_policy import PasswordPolicy  # noqa
from app.db.models.iam import Role, Permission  # noqa
from app.db.models.asset_history import AssetInstallRecord # noqa
