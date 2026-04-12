'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { ArrowsPointingOutIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AvatarCropArea } from '../../utils/avatarUpload';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (cropArea: AvatarCropArea) => void;
}

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  isSubmitting = false,
  onClose,
  onConfirm,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc, isOpen]);

  const handleCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  if (!imageSrc) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[min(92vw,880px)] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 text-primary-600">
              <PhotoIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Подготовка аватарки</h3>
              <p className="text-sm text-gray-500">
                Выберите квадратную область, которую нужно сохранить.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="relative h-[420px] overflow-hidden rounded-2xl bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
                objectFit="contain"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ArrowsPointingOutIcon className="h-4 w-4 text-primary-500" />
                Масштаб
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="text-xs text-gray-500">Потяните ползунок, чтобы приблизить фото.</div>
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:mt-auto">
              <Button
                type="button"
                onClick={() => {
                  if (!croppedAreaPixels || isSubmitting) {
                    return;
                  }

                  onConfirm({
                    x: croppedAreaPixels.x,
                    y: croppedAreaPixels.y,
                    width: croppedAreaPixels.width,
                    height: croppedAreaPixels.height,
                  });
                }}
                disabled={!croppedAreaPixels || isSubmitting}
                className="w-full bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Сохраняем...' : 'Сохранить аватарку'}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
