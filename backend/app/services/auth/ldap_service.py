import ldap
import os
import logging
from typing import Optional, Dict
logger = logging.getLogger(__name__)
class LDAPService:
    def __init__(self):
        self.server_url = os.getenv("LDAP_SERVER_URL")
        self.bind_dn = os.getenv("LDAP_BIND_DN") # Service account DN (optional if using direct bind)
        self.bind_password = os.getenv("LDAP_BIND_PASSWORD") # Service account password
        self.base_dn = os.getenv("LDAP_BASE_DN", "DC=example,DC=com")
        self.enabled = bool(self.server_url)
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, str]]:
        """
        Authenticates a user against LDAP/AD.
        Returns a dict with user info (email, full_name) if successful, None otherwise.
        """
        if not self.enabled:
            return None
        conn = None
        try:
            # 1. Initialize connection
            ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER) # Caution in prod
            conn = ldap.initialize(self.server_url)
            conn.set_option(ldap.OPT_PROTOCOL_VERSION, 3)
            conn.set_option(ldap.OPT_REFERRALS, 0)
            # 2. Find user DN
            # If we have a service account, bind with it first to search
            user_dn = None
            if self.bind_dn and self.bind_password:
                conn.simple_bind_s(self.bind_dn, self.bind_password)
                # Search for the user
                search_filter = f"(sAMAccountName={username})"
                result = conn.search_s(self.base_dn, ldap.SCOPE_SUBTREE, search_filter, ["distinguishedName", "mail", "displayName", "givenName", "sn"])
                if not result:
                    logger.warning(f"LDAP User not found: {username}")
                    return None
                user_dn = result[0][0]
                attrs = result[0][1]
            else:
                # If no service account, assume a standard DN pattern (less reliable)
                # E.g., CN=username,CN=Users,DC=example,DC=com
                # This is risky, better to require service account for search or use "username@domain" for bind
                # Let's try binding with "username@domain" if domain is in env, or construct DN
                domain = os.getenv("LDAP_DOMAIN") # e.g. "CORP.LOCAL"
                if domain:
                    user_dn = f"{username}@{domain}"
                else:
                    # Fallback or fail
                    logger.error("LDAP configuration error: Missing Bind DN/Password or LDAP_DOMAIN for direct bind.")
                    return None
                attrs = {} # We might not get attributes if we just bind
            # 3. Verify credentials by binding as the user
            # Create a NEW connection for the user bind to ensure clean state
            conn_user = ldap.initialize(self.server_url)
            conn_user.set_option(ldap.OPT_PROTOCOL_VERSION, 3)
            conn_user.set_option(ldap.OPT_REFERRALS, 0)
            conn_user.simple_bind_s(user_dn, password)
            conn_user.unbind_s()
            # If we reached here, password is correct.
            # Parse attributes
            email = attrs.get("mail", [b""])[0].decode("utf-8")
            if not email:
                 email = f"{username}@{os.getenv('LDAP_DOMAIN', 'example.com')}" # Fallback
            full_name = attrs.get("displayName", [b""])[0].decode("utf-8")
            if not full_name:
                first = attrs.get("givenName", [b""])[0].decode("utf-8")
                last = attrs.get("sn", [b""])[0].decode("utf-8")
                full_name = f"{first} {last}".strip() or username
            return {
                "username": username,
                "email": email,
                "full_name": full_name,
                "auth_source": "ldap"
            }
        except ldap.INVALID_CREDENTIALS:
            logger.warning(f"LDAP Invalid credentials for user {username}")
            return None
        except Exception as e:
            logger.error(f"LDAP Error: {e}")
            return None
        finally:
            if conn:
                try:
                    conn.unbind_s()
                except:
                    pass
ldap_service = LDAPService()
