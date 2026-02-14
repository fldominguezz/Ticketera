from pydantic import BaseModel, Field, ConfigDict # Added ConfigDict
from typing import Optional, List
from uuid import UUID
class LoginRequest(BaseModel):
    # User can login with either username or email
    identifier: str = Field(..., description="Username or email of the user.")
    password: str = Field(..., description="User's password.")
class LoginResponse(BaseModel):
    """
    Response after the first step of login (credential validation).
    """
    needs_2fa: bool = Field(False, description="Indicates if the user must complete a second factor authentication step.")
    force_password_change: bool = Field(False, description="Indicates if the user must change their password.")
    reset_2fa: bool = Field(False, description="Indicates if the user must reset their 2FA.")
    # This token is temporary and should be scoped only to the 2FA verification or password change endpoint.
    interim_token: str = Field(..., description="A temporary token to proceed with the next step.")
class TotpRequest(BaseModel):
    """
    Request to verify a TOTP code.
    """
    totp_code: str = Field(..., min_length=6, max_length=6, description="The 6-digit code from the authenticator app.")
class TotpSetupResponse(BaseModel):
    """
    Response when a user requests to set up TOTP.
    """
    secret: str = Field(..., description="The secret key to be stored in the authenticator app.")
    provisioning_uri: str = Field(..., description="The provisioning URI for the QR code.")
    recovery_codes: List[str] = Field(..., description="A list of single-use recovery codes.")
class SessionResponse(BaseModel):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: str
    last_activity_at: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True) # Changed from class Config
class ActiveSessionsResponse(BaseModel):
    current_session: SessionResponse
    other_sessions: List[SessionResponse]
class AuditLogCreate(BaseModel):
    user_id: Optional[UUID] = None
    event_type: str
    ip_address: Optional[str] = None
    details: Optional[dict] = None