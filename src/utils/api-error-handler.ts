const GENERIC_ERROR = 'Something went wrong. Please try again.';

const ERROR_MAP: Record<string, string> = {
  // Auth
  'invalid credentials': 'Incorrect email or password. Please try again.',
  'token expired': 'Your session has expired. Please log in again.',
  unauthorized: 'You are not authorized to perform this action.',
  'account not found': 'No account found with these details.',
  'account already exists': 'An account with this email already exists.',

  // Profile
  'email must be unique': 'This email is already registered.',
  'phone must be unique': 'This phone number is already in use.',
  'user not found': 'User profile could not be found.',
  'invalid file type': 'Please upload a valid image file (JPG, PNG).',
  'file size exceeded': 'Image size must be under 5MB.',

  // Booking
  'booking not found': 'This booking no longer exists.',
  'booking already cancelled': 'This booking has already been cancelled.',
  'slot not available': 'The selected time slot is no longer available.',
  'modification not allowed': 'This booking cannot be modified at this stage.',
  'payment failed': 'Payment could not be processed. Please try again.',

  // Rental / Driver
  'age not eligible': 'Driver does not meet the minimum age requirement.',
  'rental not available': 'This rental option is currently unavailable.',

  // Generic HTTP status codes
  '400': 'Invalid request. Please check your inputs.',
  '401': 'Session expired. Please log in again.',
  '403': "You don't have permission to do this.",
  '404': 'The requested resource was not found.',
  '409': 'A conflict occurred. Please refresh and try again.',
  '422': 'Some fields have invalid values. Please review and resubmit.',
  '429': 'Too many attempts. Please wait a moment and try again.',
  '500': 'A server error occurred. Please try again later.',
  '503': 'Service is temporarily unavailable. Please try again later.',
};

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function getFriendlyErrorMessage(input: {
  status?: number;
  message?: unknown;
  fallback?: string;
}): string {
  const statusKey = input.status != null ? String(input.status) : '';
  if (statusKey && ERROR_MAP[statusKey]) return ERROR_MAP[statusKey];

  const raw = normalize(input.message);
  if (raw) {
    for (const key of Object.keys(ERROR_MAP)) {
      if (!Number.isNaN(Number(key))) continue;
      if (raw.includes(key)) return ERROR_MAP[key];
    }
  }

  return input.fallback || GENERIC_ERROR;
}

export function getFriendlyError(error: unknown, fallback?: string): string {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const status = Number(
      (obj.response as Record<string, unknown> | undefined)?.status ??
        obj.status ??
        0,
    );
    const apiMessage =
      (obj.response as Record<string, unknown> | undefined)?.data &&
      typeof (obj.response as Record<string, unknown>).data === 'object'
        ? ((obj.response as Record<string, unknown>).data as Record<string, unknown>)
            .message
        : obj.message;
    return getFriendlyErrorMessage({
      status: Number.isFinite(status) && status > 0 ? status : undefined,
      message: apiMessage,
      fallback,
    });
  }
  return fallback || GENERIC_ERROR;
}

