/*
 * RTK Query API Slice
 * Определяет эндпоинты для получения и изменения данных.
 * Управляет кэшированием и инвалидированием (обновлением) кэша с помощью тегов.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../../config/env';
import { tokenStorage } from '../../services/tokenStorage';
import {
    PaymentHistory,
    PaymentHistoryDto,
    PaymentResponse,
    MakePaymentDto,
    Payment,
    CreatePaymentAndCloseDto,
    CreatePaymentAndCloseResponseDto,
} from '../../types/payment';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: env.apiBaseUrl,
        prepareHeaders: (headers) => {
            const token = tokenStorage.getAccessToken();
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Payment'],
    endpoints: (builder) => ({
        getPaymentHistory: builder.query<PaymentHistory, PaymentHistoryDto | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params) {
                    if (params.workId) searchParams.append('workId', params.workId);
                    if (params.userId) searchParams.append('userId', params.userId);
                    if (params.paymentType)
                        searchParams.append('paymentType', params.paymentType);
                    if (params.startDate)
                        searchParams.append('startDate', params.startDate);
                    if (params.endDate) searchParams.append('endDate', params.endDate);
                    if (params.page) searchParams.append('page', params.page.toString());
                    if (params.limit)
                        searchParams.append('limit', params.limit.toString());
                }
                const queryString = searchParams.toString();
                return `/payments/history${queryString ? `?${queryString}` : ''}`;
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.payments.map(({ id }) => ({
                            type: 'Payment' as const,
                            id,
                        })),
                        { type: 'Payment', id: 'LIST' },
                    ]
                    : [{ type: 'Payment', id: 'LIST' }],
        }),
        createPayment: builder.mutation<PaymentResponse, MakePaymentDto>({
            query: (body) => ({
                url: '/payments',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Payment', id: 'LIST' }],
        }),
        createPaymentAndClose: builder.mutation<
            CreatePaymentAndCloseResponseDto,
            CreatePaymentAndCloseDto
        >({
            query: (body) => ({
                url: '/payments/create-payment-and-close',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Payment', id: 'LIST' }],
        }),
        bulkCreateAndClose: builder.mutation<
            void,
            {
                items: Array<{
                    workId: string;
                    userId: string;
                    amount: number;
                    paymentDate: string;
                    description?: string;
                }>;
            }
        >({
            query: (body) => ({
                url: '/payments/bulk-create-and-close',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Payment', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetPaymentHistoryQuery,
    useCreatePaymentMutation,
    useCreatePaymentAndCloseMutation,
    useBulkCreateAndCloseMutation,
} = api;
