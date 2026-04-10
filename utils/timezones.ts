export type TimezoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
};

const CURATED_TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Etc/GMT+12', label: 'UTC-12:00', offsetMinutes: -720 },
  { value: 'Pacific/Pago_Pago', label: 'UTC-11:00', offsetMinutes: -660 },
  { value: 'Pacific/Honolulu', label: 'UTC-10:00', offsetMinutes: -600 },
  { value: 'America/Anchorage', label: 'UTC-09:00', offsetMinutes: -540 },
  { value: 'America/Los_Angeles', label: 'UTC-08:00', offsetMinutes: -480 },
  { value: 'America/Denver', label: 'UTC-07:00', offsetMinutes: -420 },
  { value: 'America/Chicago', label: 'UTC-06:00', offsetMinutes: -360 },
  { value: 'America/New_York', label: 'UTC-05:00', offsetMinutes: -300 },
  { value: 'America/Halifax', label: 'UTC-04:00', offsetMinutes: -240 },
  { value: 'America/Sao_Paulo', label: 'UTC-03:00', offsetMinutes: -180 },
  { value: 'Atlantic/South_Georgia', label: 'UTC-02:00', offsetMinutes: -120 },
  { value: 'Atlantic/Azores', label: 'UTC-01:00', offsetMinutes: -60 },
  { value: 'UTC', label: 'UTC+00:00', offsetMinutes: 0 },
  { value: 'Etc/GMT-1', label: 'UTC+01:00', offsetMinutes: 60 },
  {
    value: 'Europe/Kaliningrad',
    label: 'UTC+02:00 • Калининград',
    offsetMinutes: 120,
  },
  {
    value: 'Europe/Moscow',
    label: 'UTC+03:00 • Москва',
    offsetMinutes: 180,
  },
  {
    value: 'Europe/Samara',
    label: 'UTC+04:00 • Самара',
    offsetMinutes: 240,
  },
  {
    value: 'Asia/Yekaterinburg',
    label: 'UTC+05:00 • Екатеринбург',
    offsetMinutes: 300,
  },
  { value: 'Asia/Omsk', label: 'UTC+06:00 • Омск', offsetMinutes: 360 },
  {
    value: 'Asia/Novosibirsk',
    label: 'UTC+07:00 • Новосибирск',
    offsetMinutes: 420,
  },
  {
    value: 'Asia/Irkutsk',
    label: 'UTC+08:00 • Иркутск',
    offsetMinutes: 480,
  },
  {
    value: 'Asia/Yakutsk',
    label: 'UTC+09:00 • Якутск',
    offsetMinutes: 540,
  },
  {
    value: 'Asia/Vladivostok',
    label: 'UTC+10:00 • Владивосток',
    offsetMinutes: 600,
  },
  {
    value: 'Asia/Sakhalin',
    label: 'UTC+11:00 • Сахалин',
    offsetMinutes: 660,
  },
  {
    value: 'Asia/Kamchatka',
    label: 'UTC+12:00 • Камчатка',
    offsetMinutes: 720,
  },
  { value: 'Pacific/Fakaofo', label: 'UTC+13:00', offsetMinutes: 780 },
  { value: 'Pacific/Kiritimati', label: 'UTC+14:00', offsetMinutes: 840 },
];

export function formatTimezoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');

  return `UTC${sign}${hours}:${minutes}`;
}

export function getTimezoneOffsetMinutes(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter
      .formatToParts(now)
      .reduce<Record<string, string>>((accumulator, part) => {
        if (part.type !== 'literal') {
          accumulator[part.type] = part.value;
        }

        return accumulator;
      }, {});

    const timezoneLocal = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );

    return Math.round((timezoneLocal - now.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function formatTimezoneName(timezone: string): string {
  return timezone.replace(/_/g, ' ');
}

function createExtraTimezoneOption(timezone: string): TimezoneOption {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);

  return {
    value: timezone,
    label: `${formatTimezoneOffset(offsetMinutes)} • ${formatTimezoneName(timezone)}`,
    offsetMinutes,
  };
}

export function buildTimezoneOptions(
  extraTimezones: Array<string | null | undefined> = []
): TimezoneOption[] {
  const optionMap = new Map<string, TimezoneOption>(
    CURATED_TIMEZONE_OPTIONS.map((option) => [option.value, option])
  );

  for (const timezone of extraTimezones) {
    if (!timezone || optionMap.has(timezone)) {
      continue;
    }

    optionMap.set(timezone, createExtraTimezoneOption(timezone));
  }

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.offsetMinutes !== right.offsetMinutes) {
      return left.offsetMinutes - right.offsetMinutes;
    }

    return left.label.localeCompare(right.label, 'ru');
  });
}

export function getTimezoneDisplayLabel(timezone?: string | null): string {
  if (!timezone) {
    return 'Не указан';
  }

  const matchingOption = buildTimezoneOptions([timezone]).find(
    (option) => option.value === timezone
  );

  return matchingOption?.label ?? timezone;
}
