import { defaultEditorState, EditorState } from './types';
import { AnyAction, Reducer } from '@reduxjs/toolkit';
import { produce } from 'immer';
import { ActionWithReducers, AsyncActionWithReducers, exposeReducersWindow } from '../util';
import undoable, { includeAction, StateWithHistory } from 'redux-undo';
import {
  deleteSelection,
  insertParagraphBreak,
  paste,
  reassignParagraph,
  renameSpeaker,
  deleteSomething,
} from './edit';

import * as displayReducers from './display';
import * as editReducers from './edit';
import * as ioReducers from './io';
import * as playReducers from './play';
import * as selectionReducers from './selection';

exposeReducersWindow(displayReducers, editReducers, ioReducers, playReducers, selectionReducers);

export const reducers: (
  | ActionWithReducers<EditorState, any>
  | AsyncActionWithReducers<EditorState, any, any>
)[] = [
  ...Object.values(displayReducers),
  ...Object.values(editReducers),
  ...Object.values(ioReducers),
  ...Object.values(playReducers),
  ...Object.values(selectionReducers),
];

function editorReducer(state: EditorState | undefined, action: AnyAction): EditorState {
  if (!state) {
    return defaultEditorState;
  }

  return produce(state, (draft) => {
    reducers.forEach((reducer) => {
      reducer.handleAction(draft, action);
    });
  });
}

const stateSlice: Reducer<StateWithHistory<EditorState | null>> = undoable(editorReducer, {
  filter: includeAction([
    insertParagraphBreak.type,
    deleteSelection.type,
    deleteSomething.type,
    reassignParagraph.type,
    renameSpeaker.type,
    paste.fulfilled.type,
  ]),
  ignoreInitialState: false,
  syncFilter: true,
});
export default stateSlice;
