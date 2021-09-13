import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { RootState } from './index';
import { openEditor } from './nav';
import {
  deserializeDocument,
  Document,
  documentFromIterator,
  documentIterator,
  filterItems,
  getCurrentItem,
  serializeDocument,
  skipToTime,
  TimedParagraphItem,
} from '../core/document';
import { player } from '../core/webaudio';
import undoable, { includeAction } from 'redux-undo';

export interface Editor {
  path: string | null;
  document: Document;
  currentTime: number;
  playing: boolean;
  displaySpeakerNames: boolean;
  selection: Range | null;
}

export interface Range {
  start: number;
  length: number;
}

function assertSome<T>(x: T | null | undefined | void): asserts x is T {
  if (x === undefined || x === null) {
    throw Error(`x is not loaded (it is '${x}')`);
  }
}

export const openDocumentFromDisk = createAsyncThunk(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }): Promise<Editor> => {
    const path = await ipcRenderer
      .invoke('open-file', {
        properties: ['openFile'],
        promptToCreate: true,
        createDirectory: true,
        filters: [
          { name: 'Audapolis Project Files', extensions: ['audapolis'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePaths[0]);
    const document = await deserializeDocument(path);

    dispatch(openEditor());
    return {
      path,
      document,
      currentTime: 0,
      playing: false,
      displaySpeakerNames: false,
      selection: null,
    };
  }
);

export const openDocumentFromMemory = createAsyncThunk<Editor, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }): Promise<Editor> => {
    dispatch(openEditor());
    return { path: null, document, currentTime: 0, playing: false, displaySpeakerNames: false, selection: null };
  }
);

export const play = createAsyncThunk<void, void, { state: RootState }>(
  'editor/play',
  async (arg, { getState, dispatch }): Promise<void> => {
    const editor = getState().editor.present;
    assertSome(editor);
    if (editor.playing) {
      return;
    }
    dispatch(setPlay(true));
    const { document, currentTime } = editor;
    const progressCallback = (time: number) => dispatch(setTime(time));
    await player.play(document, currentTime, progressCallback);
    dispatch(setPlay(false));
  }
);
export const pause = createAsyncThunk<void, void, { state: RootState }>(
  'editor/pause',
  async (): Promise<void> => {
    player.pause();
  }
);
export const togglePlaying = createAsyncThunk<void, void, { state: RootState }>(
  'editor/togglePlaying',
  async (arg, { dispatch, getState }): Promise<void> => {
    if (getState().editor.present?.playing) {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  }
);

export const saveDocument = createAsyncThunk<void, void, { state: RootState }>(
  'editor/saveDocument',
  async (_, { dispatch, getState }): Promise<void> => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant save. document is undefined');
    }
    const state_path = getState().editor.present?.path;
    if (state_path) {
      await serializeDocument(document, state_path);
    } else {
      console.log('opening save dialog');
      const path = await ipcRenderer
        .invoke('save-file', {
          properties: ['saveFile'],
          filters: [
            { name: 'Audapolis Project Files', extensions: ['audapolis'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        .then((x) => x.filePath);
      console.log('saving to ', path);
      dispatch(setPath(path));
      await serializeDocument(document, path);
    }
  }
);
export const deleteSomething = createAsyncThunk<void, void, { state: RootState }>(
  'editor/delete',
  async (arg, { getState, dispatch }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (state.selection !== null) {
      dispatch(deleteSelection());
    } else {
      const item = getCurrentItem(state.document.content, state.currentTime);
      if (item?.itemIdx == 0) {
        dispatch(deleteParagraph());
      } else {
        dispatch(selectLeft());
      }
    }
  }
);

export const importSlice = createSlice({
  name: 'editor',
  initialState: null as Editor | null,
  reducers: {
    setPlay: (state, args: PayloadAction<boolean>) => {
      assertSome(state);
      state.playing = args.payload;
    },
    toggleDisplaySpeakerNames: (state) => {
      assertSome(state);
      state.displaySpeakerNames = !state.displaySpeakerNames;
    },
    setPath: (state, args: PayloadAction<string>) => {
      assertSome(state);
      state.path = args.payload;
    },

    setTime: (state, args: PayloadAction<number>) => {
      assertSome(state);
      state.currentTime = args.payload;
      state.selection = null;
    },
    goLeft: (state) => {
      assertSome(state);
      const iter = skipToTime(
        state.currentTime,
        documentIterator(state.document.content),
        true,
        true
      );
      const item = iter.next().value;
      if (!item) {
        throw new Error('something went wrong');
      }
      state.currentTime = item.absoluteStart;
      state.selection = null;
    },
    goRight: (state) => {
      assertSome(state);
      const iter = skipToTime(state.currentTime, documentIterator(state.document.content), true);
      iter.next();
      const item = iter.next().value;
      assertSome(item);
      state.currentTime = item.absoluteStart;
      state.selection = null;
    },

    selectLeft: (state) => {
      assertSome(state);
      const item = getCurrentItem(state.document.content, state.currentTime, true);
      assertSome(item);
      state.selection = { start: item.absoluteStart, length: item.end - item.start };
    },

    insertParagraph: (state) => {
      assertSome(state);

      const item = skipToTime(
        state.currentTime,
        documentIterator(state.document.content),
        true
      ).next().value;
      assertSome(item);

      const oldParagraph = state.document.content[item.paragraphIdx];
      const wordsBefore = oldParagraph.content.slice(0, item.itemIdx);
      const wordsAfter = oldParagraph.content.slice(item.itemIdx);

      state.document.content = [
        ...state.document.content.slice(0, item.paragraphIdx),
        { ...oldParagraph, content: wordsBefore },
        { ...oldParagraph, content: wordsAfter },
        ...state.document.content.slice(item.paragraphIdx + 1),
      ];
    },
    deleteParagraph: (state) => {
      assertSome(state);
      const item = getCurrentItem(state.document.content, state.currentTime);
      assertSome(item);
      const prevParagraph = state.document.content[item.paragraphIdx - 1];
      const thisParagraph = state.document.content[item.paragraphIdx];

      if (thisParagraph?.speaker !== prevParagraph?.speaker) {
        throw Error('can only merge paragraphs if speaker is the same');
      }

      state.document.content = [
        ...state.document.content.slice(0, item.paragraphIdx - 1),
        { ...thisParagraph, content: [...prevParagraph.content, ...thisParagraph.content] },
        ...state.document.content.slice(item.paragraphIdx + 1),
      ];
    },
    deleteSelection: (state) => {
      assertSome(state);
      const selection = state.selection;
      if (!selection) {
        throw new Error('selection is null');
      }
      const isNotSelected = (item: TimedParagraphItem) => {
        return !(
          item.absoluteStart <= selection.start &&
          item.absoluteStart + (item.end - item.start) >= selection.start + selection.length
        );
      };
      state.document.content = documentFromIterator(
        filterItems(isNotSelected, documentIterator(state.document.content))
      );
      state.currentTime = selection.start;
      state.selection = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openDocumentFromDisk.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromDisk.rejected, (state, action) => {
      console.error('an error occurred while trying to load the file', action.error);
    });
    builder.addCase(openDocumentFromMemory.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromMemory.rejected, (state, action) => {
      console.error('an error occurred while trying to load the doc from memory', action.error);
    });
    builder.addCase(pause.fulfilled, (state) => {
      assertSome(state);
      state.playing = false;
    });
  },
});
export const {
  toggleDisplaySpeakerNames,
  setPlay,
  setPath,
  setTime,
  
  goLeft,
  goRight,

  selectLeft,

  insertParagraph,
  deleteParagraph,
  deleteSelection,
} = importSlice.actions;
export default undoable(importSlice.reducer, {
  filter: includeAction([insertParagraph.type, deleteParagraph.type, deleteSelection.type]),
});
