import { Document, getEmptyDocument } from '../../core/document';

export interface ExportState {
  running: boolean;
  progress: number;
}

/**
 *   The selection marks the `length` items including and following the item at `startIndex`
 *   `length` MUST be > 0
 *   `headPosition` tells us which end of the selection Shift+ArrowKey moves
 */
export interface Selection {
  startIndex: number;
  length: number;
  headPosition: 'left' | 'right';
}

/**
 *   Audapolis keeps track of two cursors in a document: The player cursor and the user cursor.
 *   The user cursor denotes the element the user placed the cursor at. If can only live at item boundaries.
 *   userIndex == 0 means that the user placed the cursor in front of the first item in the document
 *   The player cursor is the time in seconds in the document the playback is at / last stopped at
 *   `current` selects which cursor dictates the user-perceived position of the cursor (i.e. what we show)
 *   `current` is determined by the following rules:
 *   - pressing play sets `current` to 'player' and updates `playerTime` to the start time of the item at `userIndex`, iff `current` was 'user'
 *   - clicking in the document or moving the cursor using the arrow keys sets `current` to 'user' and updates `userIndex` accordingly
 */
export interface Cursor {
  playerTime: number; // the current time as set by the player
  userIndex: number; // the current item the user is placed at the beginning. This can be up to document.content.length
  current: 'user' | 'player';
}

export interface EditorState {
  path: string | null;
  document: Document;
  lastSavedDocument: Document | null;

  cursor: Cursor;
  selection: Selection | null;

  playing: boolean;

  displayConfidence: boolean;

  exportState: ExportState;
  exportPopup: ExportPopupState;

  filterPopup: boolean;

  transcriptCorrectionState: string | null;
}

export type ExportPopupState = 'hidden' | 'document' | 'selection';

export class NoFileSelectedError extends Error {
  constructor() {
    super();
    this.name = 'NoFileSelectedError';
  }
}

export const defaultEditorState: EditorState = {
  path: null,
  document: getEmptyDocument(),
  lastSavedDocument: null,
  exportState: { running: false, progress: 0 },

  cursor: {
    playerTime: 0,
    userIndex: 0,
    current: 'user',
  },
  selection: null,

  playing: false,

  displayConfidence: false,

  exportPopup: 'hidden',
  filterPopup: false,

  transcriptCorrectionState: null,
};
