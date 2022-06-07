import { createActionWithReducer } from '../util';
import { EditorState, ExportPopupState } from './types';

export const toggleDisplaySpeakerNames = createActionWithReducer<EditorState>(
  'editor/toggleDisplaySpeakerNames',
  (state) => {
    state.document.metadata.display_speaker_names = !state.document.metadata.display_speaker_names;
  }
);

export const setDisplaySpeakerNames = createActionWithReducer<EditorState, boolean>(
  'editor/setDisplaySpeakerNames',
  (state, payload) => {
    state.document.metadata.display_speaker_names = payload;
  }
);

export const toggleDisplayVideo = createActionWithReducer<EditorState>(
  'editor/toggleDisplayVideo',
  (state) => {
    state.document.metadata.display_video = !state.document.metadata.display_video;
  }
);

export const toggleDisplayConfidence = createActionWithReducer<EditorState>(
  'editor/toggleDisplayConfidence',
  (state) => {
    state.displayConfidence = !state.displayConfidence;
  }
);

export const setExportPopup = createActionWithReducer<EditorState, ExportPopupState>(
  'editor/setExportPopup',
  (state, payload) => {
    state.exportPopup = payload;
  }
);

export const setFilterPopup = createActionWithReducer<EditorState, boolean>(
  'editor/setFilterPopup',
  (state, payload) => {
    state.filterPopup = payload;
  }
);

export const setExportState = createActionWithReducer<
  EditorState,
  { running: boolean; progress: number }
>('editor/setExportState', (state, exportState) => {
  state.exportState = exportState;
});
