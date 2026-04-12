const LEGACY_EMPTY_BIRTHDAY_PATTERN = /^1970-01-01(?:T00:00:00(?:\.000)?Z)?$/;

export const isMeaningfulBirthday = (birthday?: string | null): birthday is string => {
  if (!birthday) {
    return false;
  }

  const normalizedBirthday = birthday.trim();
  if (normalizedBirthday === '') {
    return false;
  }

  return !LEGACY_EMPTY_BIRTHDAY_PATTERN.test(normalizedBirthday);
};

export const normalizeBirthday = (birthday?: string | null): string | null => {
  return isMeaningfulBirthday(birthday) ? birthday : null;
};
