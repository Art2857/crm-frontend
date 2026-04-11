const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9_]/;

export const PASSWORD_REQUIREMENTS = [
  'Минимум 8 символов',
  'Минимум 3 из 4 типов: заглавные буквы, строчные буквы, цифры, специальные символы',
] as const;

export function getPasswordStrengthChecks(password: string) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = SPECIAL_CHARACTER_REGEX.test(password);

  const passedChecks = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialCharacter].filter(
    Boolean,
  ).length;

  return {
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialCharacter,
    passedChecks,
    isLongEnough: password.length >= 8,
    isValid: password.length >= 8 && passedChecks >= 3,
  };
}

export function validatePasswordStrength(password: string): true | string {
  const checks = getPasswordStrengthChecks(password);

  if (!checks.isLongEnough) {
    return 'Пароль должен содержать минимум 8 символов';
  }

  if (!checks.isValid) {
    return 'Пароль должен содержать минимум 3 из 4 типов символов: заглавные буквы, строчные буквы, цифры, специальные символы';
  }

  return true;
}

export function generateStrongPassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+?';
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';
  password += randomChar(lowercase);
  password += randomChar(uppercase);
  password += randomChar(numbers);
  password += randomChar(symbols);

  for (let i = password.length; i < length; i += 1) {
    password += randomChar(allChars);
  }

  const shuffled = password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');

  if (validatePasswordStrength(shuffled) !== true) {
    return generateStrongPassword(length);
  }

  return shuffled;
}

function randomChar(value: string): string {
  return value.charAt(Math.floor(Math.random() * value.length));
}
