export function maskEmail(email: string): string {
  const [user, domain] = email.toLocaleLowerCase().split('@');
  if (!user || !domain) return '***@***';

  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }

  return `${user[0]}${'*'.repeat(user.length - 2)}${
    user[user.length - 1]
  }@${domain}`;
}
