from pydantic import BaseModel, Field

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="The user's current password.")
    new_password: str = Field(..., min_length=12, description="The user's new password.")

class Disable2FARequest(BaseModel):
    password: str = Field(..., description="The user's password for confirmation.")