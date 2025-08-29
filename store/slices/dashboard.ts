import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService, DashboardData } from '../../services/dashboard';
import { Role } from '../../types/user';

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
  async ({ role }: { role: Role }, { rejectWithValue }) => {
    try {
      return await dashboardService.getDashboardData(role);
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
  reducers: {},
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
      });
  },
});

export const {} = dashboardSlice.actions;
export default dashboardSlice.reducer;
