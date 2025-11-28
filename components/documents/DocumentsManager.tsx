'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { documentsService, UserDocument } from '../../services/documents';
import { Eye, Download, Trash, X } from 'lucide-react';
import { useConfirmation } from '../../hooks/useConfirmation';

type Mode = 'user' | 'work';

interface Props {
  mode: Mode;
  entityId: string;
  label?: string;
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

export default function DocumentsManager({ mode, entityId, label = 'Документы' }: Props) {
  const notification = useNotification();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const deleteConfirm = useConfirmation<string>(async (id: string) => {
    try {
      await documentsService.delete(id);
      notification.showSuccess('Документ удален');
      setIsDownloadOpen(false);
      await fetchDocs();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete document', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось удалить документ';
      notification.showError(msg, 8000);
    }
  });

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const list =
        mode === 'user'
          ? await documentsService.listForUser(entityId)
          : await documentsService.listForWork(entityId);
      setDocuments(list);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load documents', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось загрузить документы';
      notification.showError(msg, 8000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entityId]);

  const onOpenAdd = () => {
    setAddName('');
    setAddFile(null);
    setIsAddOpen(true);
  };

  const onSaveAdd = async () => {
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
        await documentsService.uploadForUser({ userId: entityId, name: addName.trim(), file: addFile });
      } else {
        await documentsService.uploadForWork({ workId: entityId, name: addName.trim(), file: addFile });
      }
      setIsAddOpen(false);
      notification.showSuccess('Документ успешно загружен');
      await fetchDocs();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to upload document', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось загрузить документ';
      notification.showError(msg, 8000);
    } finally {
      setSaving(false);
    }
  };

  const onClickDoc = (doc: UserDocument) => {
    setSelectedDoc(doc);
    setIsDownloadOpen(true);
  };

  const onDownload = async () => {
    if (!selectedDoc) return;
    try {
      const { url, filename } = await documentsService.getDownloadUrl(selectedDoc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || selectedDoc.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setIsDownloadOpen(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to get download URL', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось получить ссылку на файл';
      notification.showError(msg, 8000);
    }
  };

  const onPreview = async () => {
    if (!selectedDoc) return;
    try {
      const { url } = await documentsService.getPreviewUrl(selectedDoc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsDownloadOpen(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to get preview URL', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось получить ссылку на предпросмотр';
      notification.showError(msg, 8000);
    }
  };

  const onDownloadAll = async () => {
    try {
      const blob =
        mode === 'user'
          ? await documentsService.downloadUserZip(entityId)
          : await documentsService.downloadWorkZip(entityId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mode}-${entityId}-documents.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to download all documents (zip)', err);
      const msg = err?.originalData?.message || err?.message || 'Не удалось скачать архив документов';
      notification.showError(msg, 8000);
    }
  };

  const AddButton = useMemo(() => {
    return (
      <Button
        type="button"
        onClick={onOpenAdd}
        variant="outline"
        size="sm"
        className="px-2 py-1 min-h-[32px] min-w-[32px]"
      >
        Добавить документ
      </Button>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasDocuments = !loading && documents.length > 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          {hasDocuments && (
            <Button
              type="button"
              onClick={onDownloadAll}
              variant="outline"
              size="sm"
              aria-label="Скачать все документы"
              title="Скачать все документы"
              className="px-2 py-1 min-h-[32px] min-w-[32px]"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          {AddButton}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Загрузка документов…</div>
      ) : documents.length === 0 ? (
        <div className="text-sm text-gray-500">Документов пока нет</div>
      ) : (
        <div className="text-sm text-gray-900 mt-1">
          {documents.map((doc, idx) => (
            <React.Fragment key={doc.id}>
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={() => onClickDoc(doc)}
                title={doc.originalName}
              >
                {doc.name}
              </button>
              {idx < documents.length - 1 && (
                <span className="mx-1 text-gray-400">,</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Добавить файл */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <div className="w-[420px] max-w-[90vw] p-4">
          <h3 className="text-lg font-semibold mb-4">Добавить документ</h3>
          <div className="space-y-4">
            <Input
              id="docName"
              name="docName"
              label="Название документа"
              fullWidth
              value={addName}
              onChange={(e: any) => setAddName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Файл</label>
              <input
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => setAddFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:rounded-r-none file:border-0 file:text-sm file:bg-primary-100 file:text-black file:hover:bg-blue-200 file:transition file:duration-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Допустимые типы: PNG, JPEG, JPG, GIF, WEBP, PDF, DOC, DOCX
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={onSaveAdd} isLoading={saving}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модуль действия документа */}
      <Modal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)}>
        <div className="relative w-[380px] max-w-[90vw] p-4">
          {/* Крестик */}
          <button
            type="button"
            onClick={() => setIsDownloadOpen(false)}
            className="absolute right-3 top-3 inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-lg font-semibold mb-4 pr-6">Документ</h3>

          <div className="text-sm mb-4">
            <div className="text-gray-500">Название</div>
            <div className="font-medium">{selectedDoc?.name}</div>
            {selectedDoc?.originalName && (
              <div className="mt-2">
                <div className="text-gray-500">Оригинальное имя</div>
                <div className="text-gray-700 break-all">{selectedDoc.originalName}</div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {/* Удалить */}
            <Button
              type="button"
              onClick={() =>
                selectedDoc &&
                deleteConfirm.confirmAndExecute(selectedDoc.id, 'Удалить этот документ?', {
                  title: 'Удаление документа',
                  confirmText: 'Удалить',
                  cancelText: 'Отмена',
                  variant: 'danger',
                })
              }
              className="px-2 py-2 min-h-[32px] min-w-[32px] !bg-red-50 border !border-red-300 !text-gray-700 hover:!text-white hover:!bg-red-500"
              aria-label="Удалить документ"
              title="Удалить"
            >
              <Trash className="w-4 h-4" />
            </Button>

            {/* Предпросмотр */}
            <Button
              type="button"
              variant="outline"
              onClick={onPreview}
              className="px-2 py-2 min-h-[32px] min-w-[32px] !bg-green-50 !border-green-300 hover:!bg-green-500 hover:!text-white"
              aria-label="Предпросмотр документа"
              title="Предпросмотр"
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* Скачать */}
            <Button
              type="button"
              variant="outline"
              onClick={onDownload}
              className="px-2 py-2 min-h-[32px] min-w-[32px] !bg-blue-50 !border-blue-300 hover:!bg-blue-500 hover:!text-white"
              aria-label="Скачать документ"
              title="Скачать"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

