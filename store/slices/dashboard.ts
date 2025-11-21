import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService, DashboardData } from '../../services/dashboard';
import { logout } from './auth';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  isLoading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_: void, { rejectWithValue }) => {
    try {
      return await dashboardService.getDashboardData();
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Не удалось загрузить данные главной страницы'
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardData: (state) => {
      state.data = null;
      state.error = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Очищаем данные дашборда при выходе из системы
      .addCase(logout, (state) => {
        state.data = null;
        state.error = null;
        state.isLoading = false;
      });
  },
});

export const { clearDashboardData } = dashboardSlice.actions;
export default dashboardSlice.reducer;
