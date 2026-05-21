export type FieldErrors = Partial<Record<string, string>>;

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Map sign-in / auth API messages to the most relevant field. */
export function mapAuthErrorToField(message: string): 'email' | 'password' {
  const m = message.toLowerCase();
  if (
    m.includes('email') ||
    m.includes('user not found') ||
    m.includes('no user') ||
    m.includes('account not found') ||
    m.includes('invalid email')
  ) {
    return 'email';
  }
  return 'password';
}
