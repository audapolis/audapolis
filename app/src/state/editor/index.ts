import { editorDefaults, EditorState } from './types';
import { AnyAction, Reducer } from '@reduxjs/toolkit';
import { produce } from 'immer';
import { ActionWithReducers, AsyncActionWithReducers } from '../util';
import undoable, { includeAction, StateWithHistory } from 'redux-undo';
import {
  deleteSelection,
  deleteParagraphBreak,
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
import { emptyDocument } from '../../core/document';

const reducers: (
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
    return {
      ...editorDefaults,
      path: null,
      document: emptyDocument,
    };
  }

  return produce(state, (draft) => {
    reducers.forEach((reducer) => {
      if ('reducer' in reducer) {
        if (reducer.type == action.type) {
          reducer.reducer(draft, action.payload);
        }
      } else {
        Object.entries(reducer.reducers).forEach(([actionType, reducer]) => {
          if (actionType == action.type) {
            reducer(draft, action.payload);
          }
        });
      }
    });
  });
}

const stateSlice: Reducer<StateWithHistory<EditorState | null>> = undoable(editorReducer, {
  filter: includeAction([
    insertParagraphBreak.type,
    deleteParagraphBreak.type,
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
