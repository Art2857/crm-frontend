import React, { createContext, useContext } from 'react';

type Mode = 'user' | 'work';

export type DocumentsDeferredHandlers = {
  commit: () => Promise<void>;
  discard: () => void;
  hasPending: () => boolean;
};

export interface DocumentsStagingConfig {
  isDeferred: boolean;
  mode?: Mode;
  entityId?: string;
  registerHandlers?: (handlers: DocumentsDeferredHandlers) => void;
}

const defaultValue: DocumentsStagingConfig = {
  isDeferred: false,
};

export const DocumentsStagingContext = createContext<DocumentsStagingConfig>(defaultValue);

export const useDocumentsStaging = () => useContext(DocumentsStagingContext);

