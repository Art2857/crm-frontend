'use client';

import React from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';

type SortValue = 'name_asc' | 'name_desc' | 'createdAt_asc' | 'createdAt_desc';

interface UsersFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleChange: (value: string) => void;
  sort: SortValue;
  onSortChange: (value: SortValue) => void;
  onClear: () => void;
}

const ROLE_OPTIONS = [
  { value: '', label: 'Все роли' },
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'WORKER', label: 'Работник' },
] as const;

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'name_asc', label: 'По имени: A-Я' },
  { value: 'name_desc', label: 'По имени: Я-А' },
  { value: 'createdAt_asc', label: 'Дата создания: старые первыми' },
  { value: 'createdAt_desc', label: 'Дата создания: новые первыми' },
];

export default function UsersFiltersBar({
  search,
  onSearchChange,
  roleFilter,
  onRoleChange,
  sort,
  onSortChange,
  onClear,
}: UsersFiltersBarProps) {
  return (
    <div className="mb-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="w-full">
          <Input
            fullWidth
            placeholder="Поиск по имени и email"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-4">
          <div className="sm:min-w-[220px] sm:w-1/3">
            <Select
              fullWidth
              value={roleFilter}
              onChange={(e) => onRoleChange(e.target.value)}
              label="Фильтр по ролям"
              aria-label="Все роли"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:min-w-[240px] sm:w-1/3">
            <Select
              fullWidth
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortValue)}
              label="Сортировка"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:flex-1 flex sm:justify-end items-center">
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Очистить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
