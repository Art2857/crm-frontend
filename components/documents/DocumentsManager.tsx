'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, File, FileImage, FileText, Plus, Trash2 } from 'lucide-react';

import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import { formatDateForDisplay } from '../../utils/date';
import { documentsService, UserDocument } from '../../services/documents';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

type Mode = 'user' | 'work';

interface DocumentsManagerProps {
  mode: Mode;
  entityId: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  canManage?: boolean;
}

const ACCEPT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPT_ATTR = ACCEPT_TYPES.join(',');
const WORD_DOCUMENT_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const PDF_DOCUMENT_TYPES = new Set(['application/pdf']);

function isWordDocument(mimeType?: string | null): boolean {
  return mimeType !== undefined && mimeType !== null ? WORD_DOCUMENT_TYPES.has(mimeType) : false;
}

function isPdfDocument(mimeType?: string | null): boolean {
  return mimeType !== undefined && mimeType !== null ? PDF_DOCUMENT_TYPES.has(mimeType) : false;
}

function isImageDocument(mimeType?: string | null): boolean {
  return typeof mimeType === 'string' ? mimeType.startsWith('image/') : false;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} Б`;
  }

  const units = ['КБ', 'МБ', 'ГБ'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)} ${units[unitIndex]}`;
}

function getDefaultDocumentName(fileName: string): string {
  const segments = fileName.split('.');
  if (segments.length === 1) {
    return fileName;
  }

  segments.pop();
  return segments.join('.');
}

function getDocumentPresentation(mimeType?: string | null) {
  if (isImageDocument(mimeType)) {
    return {
      icon: FileImage,
      iconClassName: 'text-emerald-600',
      containerClassName: 'bg-emerald-50 ring-1 ring-emerald-100',
      badgeLabel: 'Изображение',
      badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }

  if (isPdfDocument(mimeType)) {
    return {
      icon: FileText,
      iconClassName: 'text-rose-600',
      containerClassName: 'bg-rose-50 ring-1 ring-rose-100',
      badgeLabel: 'PDF',
      badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    };
  }

  if (isWordDocument(mimeType)) {
    return {
      icon: FileText,
      iconClassName: 'text-blue-600',
      containerClassName: 'bg-blue-50 ring-1 ring-blue-100',
      badgeLabel: 'Word',
      badgeClassName: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    };
  }

  return {
    icon: File,
    iconClassName: 'text-gray-600',
    containerClassName: 'bg-gray-100 ring-1 ring-gray-200',
    badgeLabel: 'Файл',
    badgeClassName: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  };
}

export default function DocumentsManager({
  mode,
  entityId,
  title = 'Документы',
  description = 'Управляйте документами и файлами, связанными с этой сущностью.',
  emptyTitle = 'Документов пока нет',
  emptyDescription = 'Добавьте первый документ, чтобы он появился в списке.',
  canManage = true,
}: DocumentsManagerProps) {
  const notification = useNotification();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const list =
        mode === 'user'
          ? await documentsService.listForUser(entityId)
          : await documentsService.listForWork(entityId);
      setDocuments(list);
    } catch (err: any) {
      const msg = err?.originalData?.message || err?.message || 'Не удалось загрузить документы';
      notification.showError(msg, 8000);
    } finally {
      setLoading(false);
    }
  }, [entityId, mode, notification]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const previewDocument = useCallback(
    async (doc: UserDocument) => {
      let previewWindow: Window | null = null;

      try {
        if (isWordDocument(doc.mimeType)) {
          previewWindow = window.open('', '_blank');
          if (!previewWindow) {
            notification.showError('Разрешите открытие новой вкладки для предпросмотра документа');
            return;
          }

          previewWindow.document.write(
            '<div style="font-family: Arial, sans-serif; padding: 16px;">Загрузка документа...</div>',
          );

          const html = await documentsService.getPreviewHtml(doc.id);
          previewWindow.document.open();
          previewWindow.document.write(html);
          previewWindow.document.close();
          return;
        }

        const { url } = await documentsService.getPreviewUrl(doc.id);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (err: any) {
        if (previewWindow && !previewWindow.closed) {
          previewWindow.close();
        }

        const msg =
          err?.originalData?.message ||
          err?.message ||
          'Не удалось получить ссылку на предпросмотр';
        notification.showError(msg, 8000);
      }
    },
    [notification],
  );

  const downloadDocument = useCallback(
    async (doc: UserDocument) => {
      try {
        const { url, filename } = await documentsService.getDownloadUrl(doc.id);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || doc.originalName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err: any) {
        const msg = err?.originalData?.message || err?.message || 'Не удалось скачать документ';
        notification.showError(msg, 8000);
      }
    },
    [notification],
  );

  const downloadAllDocuments = useCallback(async () => {
    try {
      const blob =
        mode === 'user'
          ? await documentsService.downloadUserZip(entityId)
          : await documentsService.downloadWorkZip(entityId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mode}-${entityId}-documents.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg =
        err?.originalData?.message || err?.message || 'Не удалось скачать архив документов';
      notification.showError(msg, 8000);
    }
  }, [entityId, mode, notification]);

  const deleteConfirm = useConfirmation<UserDocument>(async (doc) => {
    try {
      await documentsService.delete(doc.id);
      notification.showSuccess('Документ удален');
      await fetchDocs();
    } catch (err: any) {
      const msg = err?.originalData?.message || err?.message || 'Не удалось удалить документ';
      notification.showError(msg, 8000);
    }
  });

  const openAddModal = useCallback(() => {
    setAddName('');
    setAddFile(null);
    setIsAddOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    if (saving) {
      return;
    }

    setIsAddOpen(false);
    setAddName('');
    setAddFile(null);
  }, [saving]);

  const saveDocument = useCallback(async () => {
    if (!addFile) {
      notification.showError('Пожалуйста, выберите файл');
      return;
    }

    if (addName.trim().length === 0) {
      notification.showError('Пожалуйста, укажите название документа');
      return;
    }

    if (!ACCEPT_TYPES.includes(addFile.type)) {
      notification.showError('Недопустимый тип файла');
      return;
    }

    try {
      setSaving(true);

      if (mode === 'user') {
        await documentsService.uploadForUser({
          userId: entityId,
          name: addName.trim(),
          file: addFile,
        });
      } else {
        await documentsService.uploadForWork({
          workId: entityId,
          name: addName.trim(),
          file: addFile,
        });
      }

      notification.showSuccess('Документ успешно загружен');
      closeAddModal();
      await fetchDocs();
    } catch (err: any) {
      const msg = err?.originalData?.message || err?.message || 'Не удалось загрузить документ';
      notification.showError(msg, 8000);
    } finally {
      setSaving(false);
    }
  }, [addFile, addName, closeAddModal, entityId, fetchDocs, mode, notification]);

  const documentsCountLabel = useMemo(() => {
    const count = documents.length;
    if (count === 1) {
      return '1 документ';
    }
    if (count >= 2 && count <= 4) {
      return `${count} документа`;
    }
    return `${count} документов`;
  }, [documents.length]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-r from-white via-gray-50 to-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
                  {documentsCountLabel}
                </span>
              </div>
              <p className="max-w-3xl text-sm text-gray-500">{description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {documents.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadAllDocuments}
                  className="border-gray-200 bg-white/90"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Скачать все
                </Button>
              )}
              {canManage && (
                <Button
                  type="button"
                  onClick={openAddModal}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-sm hover:from-primary-700 hover:to-primary-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить документ
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
              Загрузка документов...
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <File className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">{emptyTitle}</h4>
              <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{emptyDescription}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const presentation = getDocumentPresentation(doc.mimeType);
                  const Icon = presentation.icon;

                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col gap-4 px-5 py-4 transition-colors duration-200 hover:bg-gray-50/80 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${presentation.containerClassName}`}
                        >
                          <Icon className={`h-6 w-6 ${presentation.iconClassName}`} />
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-gray-900">
                              {doc.name}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.badgeClassName}`}
                            >
                              {presentation.badgeLabel}
                            </span>
                          </div>
                          <div className="truncate text-sm text-gray-500">{doc.originalName}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span>Добавлен: {formatDateForDisplay(doc.createdAt, true)}</span>
                            <span>Размер: {formatFileSize(doc.size)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void previewDocument(doc)}
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Открыть
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void downloadDocument(doc)}
                          className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Скачать
                        </Button>
                        {canManage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              deleteConfirm.confirmAndExecute(doc, 'Удалить этот документ?', {
                                confirmText: 'Удалить',
                                variant: 'danger',
                              })
                            }
                            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={closeAddModal}>
        <div className="w-[520px] max-w-[92vw] p-6">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-gray-900">Добавить документ</h3>
            <p className="mt-1 text-sm text-gray-500">
              Загрузите файл и укажите понятное название, по которому его будет легко найти в
              списке.
            </p>
          </div>

          <div className="space-y-5">
            <Input
              id="docName"
              name="docName"
              label="Название документа"
              fullWidth
              value={addName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddName(e.target.value)}
              placeholder="Например: Договор, Техническое задание, Акт"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Файл</label>
              <input
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null;
                  setAddFile(nextFile);
                  if (nextFile && addName.trim() === '') {
                    setAddName(getDefaultDocumentName(nextFile.name));
                  }
                }}
                className="block w-full cursor-pointer rounded-xl border border-gray-300 bg-gray-50 text-sm text-gray-900 file:mr-4 file:border-0 file:border-r file:border-gray-200 file:bg-primary-100 file:px-4 file:py-3 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-primary-200"
              />
              <p className="mt-2 text-xs text-gray-500">
                Допустимые типы: PNG, JPEG, JPG, GIF, WEBP, PDF, DOC, DOCX
              </p>
            </div>

            {addFile && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                <div className="font-medium text-gray-900">{addFile.name}</div>
                <div className="mt-1 text-xs text-gray-500">{formatFileSize(addFile.size)}</div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <Button type="button" variant="outline" onClick={closeAddModal} disabled={saving}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void saveDocument()} isLoading={saving}>
              Сохранить документ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
