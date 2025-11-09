import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isConnected: boolean | null;
  lastChanged: number | null;
}

const initialState: NetworkState = {
  isConnected: null,
  lastChanged: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setIsConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
      state.lastChanged = Date.now();
    },
  },
});

export const { setIsConnected } = networkSlice.actions;

export default networkSlice.reducer;

