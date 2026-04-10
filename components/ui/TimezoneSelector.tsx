'use client';

import React, { useMemo } from 'react';
import { useTimezone } from '../../contexts/TimezoneContext';
import { buildTimezoneOptions } from '../../utils/timezones';

type Props = {
  className?: string;
  // Режим контролируемого использования (для форм админки)
  value?: string;
  onChange?: (tz: string) => void;
  label?: string;
  selectClassName?: string;
};

import Select from './Select';

const TimezoneSelector: React.FC<Props> = ({
  className,
  value,
  onChange,
  label = 'Часовой пояс',
  selectClassName,
}) => {
  const { timezone, setTimezone, availableTimezones } = useTimezone();
  const currentValue = value ?? timezone;

  const options = useMemo(() => {
    return buildTimezoneOptions([
      currentValue,
      ...availableTimezones.map((option) => option.value),
    ]).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [availableTimezones, currentValue]);

  const handleChange = (tz: string) => {
    if (onChange) onChange(tz);
    else setTimezone(tz);
  };

  return (
    <Select
      id="tz"
      label={label}
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className={selectClassName ?? className}
      options={options}
      fullWidth
    />
  );
};

export default TimezoneSelector;
