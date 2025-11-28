import { privateApi } from './ApiClient';

export interface UserDocument {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  ownerUserId?: string | null;
}

export interface DownloadUrlResponse {
  url: string;
  filename: string;
  mimeType: string;
}

export const documentsService = {
  async listForUser(userId: string): Promise<UserDocument[]> {
    const res = await privateApi.get<UserDocument[]>(`/users/${userId}/documents`);
    return res.data;
  },

  async listForWork(workId: string): Promise<UserDocument[]> {
    const res = await privateApi.get<UserDocument[]>(`/works/${workId}/documents`);
    return res.data;
  },

  async uploadForUser(params: {
    userId: string;
    name: string;
    file: File;
  }): Promise<UserDocument> {
    const { userId, name, file } = params;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    const res = await privateApi.post<UserDocument>(
      `/users/${userId}/upload-file`,
      formData
    );
    return res.data;
  },

  async uploadForWork(params: {
    workId: string;
    name: string;
    file: File;
  }): Promise<UserDocument> {
    const { workId, name, file } = params;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    const res = await privateApi.post<UserDocument>(
      `/work-history/${workId}/upload-file`,
      formData
    );
    return res.data;
  },

  async getDownloadUrl(documentId: string): Promise<DownloadUrlResponse> {
    const res = await privateApi.get<DownloadUrlResponse>(
      `/documents/${documentId}/download-url`
    );
    return res.data;
  },

  async getPreviewUrl(documentId: string): Promise<DownloadUrlResponse> {
    const res = await privateApi.get<DownloadUrlResponse>(
      `/documents/${documentId}/preview-url`
    );
    return res.data;
  },

  async downloadUserZip(userId: string): Promise<Blob> {
    const res = await privateApi.get<Blob>(`/users/${userId}/documents-zip`, {
      responseType: 'blob' as any,
    });
    return res.data as any;
  },

  async downloadWorkZip(workId: string): Promise<Blob> {
    const res = await privateApi.get<Blob>(`/works/${workId}/documents-zip`, {
      responseType: 'blob' as any,
    });
    return res.data as any;
  },

  async delete(documentId: string): Promise<void> {
    await privateApi.delete(`/documents/${documentId}`);
  },
};
