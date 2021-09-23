import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState, setServer } from './models';
import { RootState } from './index';
import { ServerConfig } from './server';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  Settings,
  ManageServer,
}
export interface NavState {
  page: Page;
}

export const openManageServer = createAsyncThunk<void, ServerConfig, { state: RootState }>(
  'nav/openManageServer',
  async (server, { dispatch }) => {
    await dispatch(setServer(server));
    dispatch(fetchModelState());
  }
);

export const openTranscribe = createAsyncThunk<void, void, { state: RootState }>(
  'nav/openTranscribe',
  async (_, { dispatch }) => {
    dispatch(fetchModelState());
  }
);

export const navSlice = createSlice({
  name: 'nav',
  initialState: {
    page: Page.Landing,
  },
  reducers: {
    openEditor: (state) => {
      state.page = Page.Editor;
    },
    openLanding: (state) => {
      state.page = Page.Landing;
    },
    openTranscribing: (state) => {
      state.page = Page.Transcribing;
    },
    openSettings: (state) => {
      state.page = Page.Settings;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openManageServer.fulfilled, (state) => {
      state.page = Page.ManageServer;
    });
    builder.addCase(openTranscribe.pending, (state) => {
      state.page = Page.Transcribe;
    });
  },
});

export const { openEditor, openLanding, openTranscribing, openSettings } = navSlice.actions;
export default navSlice.reducer;
