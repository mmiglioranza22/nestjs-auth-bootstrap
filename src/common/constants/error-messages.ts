// * Mind error messages:
// Rule of thumb: specific error messages are for logs, error messages that return to the client must be 'indicative enough'
export const GENERAL_SEED_ERROR =
  'Seed database error. Unable to initialize. Check logs or talk to your administrator';

export const SIGNUP_ERROR = 'Error on sign up';

export const INVALID_USER_CREDENTIALS = 'Unauthorized. Invalid credentials';

export const INACTIVE_USER =
  'Unauthorized. Invalid credentials. Talk to your administrator';

export const INVALID_USER_FALLBACK =
  'Unauthorized. Invalid user (Request). Check route controller';

export const PENDING_ACCOUNT_VERIFICATION =
  'Pending account verification. Please check your inbox';

export const ACCOUNT_ALREADY_VERIFIED = 'Invalid action. Try login in';

export const ROLE_GUARD_UNAUTHORIZED_USER =
  'Unauthorized. User not found in database. Talk to your administrator';

export const ROLE_GUARD_FORBIDDEN = 'Forbidden. Access denied';

export const INVALID_AGENT_ACTION_USER =
  'Invalid action. Invalid user (forbidden) or user cannot be removed';

export const IMPOSSIBLE_ACTION_USER_NOT_FOUND =
  'Impossible action. User not found';

export const INVALID_REFRESH_TOKEN =
  'Invalid token provided. Please log in to validate new credentials';

export const INVALID_MISSING_COOKIES =
  'Unathorized. You must be logged in to revalidate credentials';

export const IMPOSSIBLE_ACTION_TO_SELF =
  'Impossible action. User cannot perform action to self';

// Global filter
export const INVALID_SIGNUP_USER_VALUES =
  'Invalid values provided for user sign up';

export const NOT_FOUND_REQUESTED_ENTITY =
  'Check request query params and body values';

export const MISSING_USER_PASSWORDS =
  'Please provide the new and the old passwords';

// Token specific
export const EXPIRED_ACCESS_TOKEN = 'Access token expired';

export const EXPIRED_REFRESH_TOKEN = 'Refresh token expired. Please log in.';

export const TAMPERED_ACCESS_TOKEN = 'Invalid access token';

export const TAMPERED_REFRESH_TOKEN = 'Invalid refresh token';

export const INVALID_RECOVERY_TOKEN = 'Invalid recovery token';

export const INVALID_NEW_PASSWORD_ALREADY_USED =
  'Invalid password. Your new password cannot be your last known password';

export const INVALID_USER_NEW_PASSWORD =
  'Invalid. Old password cannot be the new password. Please check again';

export const INVALID_USER_OLD_PASSWORD =
  'Invalid. Old password must be the last valid one. Please check again';

export const INVALID_ACTION_MISSING_CLEAREANCE =
  'Invalid action. User has no permissions for such action';

export const CSRF_TOKEN_MISSING = 'Forbidden. Missing CSRF token';

export const CSRF_TOKEN_MISMATCH = 'Forbidden. CSRF token mismatch';

export const CSRF_TOKEN_INVALID = 'Forbidden. Invalid CSRF token';

export const INVALID_CACHE_KEY_FORMAT = 'Invalid cache key provided';
