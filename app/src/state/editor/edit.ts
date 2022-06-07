import { assertSome, assertUnreachable } from '../../util';
import {
  deserializeDocument,
  Document,
  serializeDocument,
  Source,
  UuidExtension,
  V3DocumentItem,
  V3ParagraphStartItem,
  V3TextItem,
  V3TimedDocumentItem,
} from '../../core/document';
import { clipboard } from 'electron';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState } from './types';
import {
  currentCursorTime,
  currentIndex,
  currentItem,
  currentNotNullParagraphStart,
  firstPossibleCursorPosition,
  getNotNullParagraphStart,
  getNotNullSpeakerNameAtIndex,
  isParagraphItem,
  macroItemsToText,
  memoizedMacroItems,
  selectedItems,
  selectionDocument,
} from './selectors';
import { v4 as uuidv4 } from 'uuid';

function getInsertPos(state: EditorState): number {
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex;
    case 'player': {
      const item = currentItem(state);
      if (!item) {
        throw new Error('no current item');
      }
      const curPos = currentCursorTime(state);
      const itemLength = 'length' in item ? item.length : 0;
      const itemMiddle = item.absoluteStart + itemLength / 2;
      return curPos <= itemMiddle ? item.absoluteIndex : item.absoluteIndex + 1;
    }
  }
}
function ensureValidCursorPosition(state: EditorState) {
  if (state.cursor.current == 'user') {
    state.cursor.userIndex = Math.max(
      state.cursor.userIndex,
      firstPossibleCursorPosition(state.document.content)
    );
  }
}
export const insertParagraphEnd = createActionWithReducer<EditorState>(
  'editor/insertParagraphEnd',
  (state) => {
    ensureValidCursorPosition(state);
    const insertPos = getInsertPos(state);
    const paraStart = currentNotNullParagraphStart(state);
    state.document.content.splice(
      insertPos,
      0,
      { type: 'paragraph_end', uuid: uuidv4() },
      { ...paraStart, uuid: uuidv4() }
    );
    state.cursor.current = 'user';
    state.cursor.userIndex = insertPos + 2;
  }
);

export const deleteSelection = createActionWithReducer<EditorState>(
  'editor/deleteSelection',
  (state) => {
    const selection = state.selection;
    if (!selection) {
      return;
    }
    const selectionEnd = Math.min(
      selection.startIndex + selection.length,
      state.document.content.length
    );

    const restoreElems: V3DocumentItem[] = [];
    const prevElem = state.document.content[selection.startIndex - 1];
    const nextElem = state.document.content[selectionEnd];
    if (selection.startIndex == 0 && !(nextElem && nextElem.type === 'paragraph_start')) {
      // We're removing the first paragraph_start and are not starting with a new one, so we need to add a new one instead
      const missing_paragraph_start = getNotNullParagraphStart(
        state.document.content,
        selection.startIndex + selection.length
      );
      restoreElems.push({ ...missing_paragraph_start, uuid: uuidv4() });
    }
    if (
      selectionEnd === state.document.content.length &&
      !(prevElem && prevElem.type === 'paragraph_end')
    ) {
      restoreElems.push({ type: 'paragraph_end', uuid: uuidv4() });
    }
    state.document.content.splice(selection.startIndex, selection.length, ...restoreElems);
    state.cursor.current = 'user';
    state.cursor.userIndex = selection.startIndex;

    state.selection = null;
  }
);

export const setText = createActionWithReducer<
  EditorState,
  { absoluteIndex: number; text: string }
>('editor/setWord', (state, payload) => {
  const item = state.document.content[payload.absoluteIndex];
  if (item.type !== 'text') {
    throw new Error('setText called on item that is not a text');
  }
  item.text = payload.text;
});

export const reassignParagraph = createActionWithReducer<
  EditorState,
  { absoluteIndex: number; newSpeaker: string }
>('editor/reassignParagraph', (state, payload) => {
  const { absoluteIndex, newSpeaker } = payload;
  const item = state.document.content[absoluteIndex];
  if (item.type !== 'paragraph_start') {
    throw new Error('reassignParagraph called on item that is not a paragraph_start');
  }
  item.speaker = newSpeaker;
});

export const renameSpeaker = createActionWithReducer<
  EditorState,
  { oldName: string | null; newName: string }
>('editor/renameSpeaker', (state, payload) => {
  const { oldName, newName } = payload;

  state.document.content = state.document.content.map((item) => {
    if (item.type == 'paragraph_start' && item.speaker === oldName) {
      return { ...item, speaker: newName };
    } else {
      return item;
    }
  });
});

function deleteParagraphEnd(state: EditorState, currentIndex: number) {
  const item = state.document.content[currentIndex];
  if (item.type !== 'paragraph_end') {
    throw new Error('deleteParagraphEnd needs to be called on a paragraph_end');
  }
  if (currentIndex == state.document.content.length - 1) {
    return;
  }
  state.document.content.splice(currentIndex, 2);
  state.cursor.current = 'user';
  state.cursor.userIndex = currentIndex;
}

function deleteParagraphStart(state: EditorState, currentIndex: number) {
  const item = state.document.content[currentIndex];
  if (item.type !== 'paragraph_start') {
    throw new Error('deleteParagraphEnd needs to be called on a paragraph_end');
  }
  if (currentIndex == 0) {
    return;
  }
  state.document.content.splice(currentIndex - 1, 2);
  state.cursor.current = 'user';
  state.cursor.userIndex = currentIndex - 1;
}

function shouldLookLeft(state: EditorState, direction: string): boolean {
  if (direction == 'left' && state.cursor.current == 'user') {
    return true;
  }
  return (
    state.cursor.current == 'player' &&
    state.cursor.playerTime == currentItem(state)?.absoluteStart &&
    direction == 'left'
  );
}
function deleteNonSelection(state: EditorState, direction: 'left' | 'right') {
  const directionOffset = shouldLookLeft(state, direction) ? 1 : 0;
  const curIdx = currentIndex(state) - directionOffset;
  if (curIdx < 0) {
    return;
  }
  const item = state.document.content[curIdx];
  switch (item.type) {
    case 'paragraph_end': {
      deleteParagraphEnd(state, curIdx);
      break;
    }
    case 'paragraph_start': {
      deleteParagraphStart(state, curIdx);
      break;
    }
    case 'text':
    case 'non_text':
    case 'artificial_silence': {
      state.selection = { headPosition: direction, startIndex: curIdx, length: 1 };
      break;
    }
    default:
      assertUnreachable(item);
  }
}
export const deleteSomething = createActionWithReducer<EditorState, 'left' | 'right'>(
  'editor/deleteSomething',
  (state, direction) => {
    if (state.selection !== null) {
      deleteSelection.reducer(state);
    } else {
      deleteNonSelection(state, direction);
    }
  }
);

export const copy = createAsyncActionWithReducer<EditorState>(
  'editor/copy',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const serializedSlice = await serializeDocument(selectionDocument(state)).generateAsync({
      type: 'nodebuffer',
      streamFiles: true,
    });
    clipboard.writeBuffer('x-audapolis/document-zip', serializedSlice);
  }
);

export const cut = createAsyncActionWithReducer<EditorState>(
  'editor/cut',
  async (arg, { dispatch }) => {
    await dispatch(copy());
    dispatch(deleteSelection());
  }
);

export type ClipboardDocument = Pick<Document, 'sources' | 'content'>;
export const paste = createAsyncActionWithReducer<EditorState, void, ClipboardDocument>(
  'editor/paste',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (!clipboard.has('x-audapolis/document-zip')) {
      throw new Error('Clipboard does not contain an audapolis document');
    }
    const buffer = clipboard.readBuffer('x-audapolis/document-zip');
    // TODO: Don't extract sources from zip we already have in our file
    const deserialized = await deserializeDocument(buffer);
    console.log('deserialized document from clipboard: ', deserialized);
    return deserialized;
  },
  {
    fulfilled: (state, payload) => {
      if (payload.content.length == 0) {
        return;
      }
      const mergedSources = { ...state.document.sources, ...payload.sources };
      checkPastedContent(payload, mergedSources);
      deleteSelection.reducer(state);

      if (
        state.document.content.length == 2 &&
        state.document.content[0].type == 'paragraph_start' &&
        state.document.content[0].speaker == ''
      ) {
        state.document.content.splice(0, state.document.content.length, ...payload.content);
        state.document.sources = mergedSources;
        return;
      }

      payload.content = payload.content.map((x) => ({ ...x, uuid: uuidv4() }));

      const insertPos = Math.max(
        getInsertPos(state),
        firstPossibleCursorPosition(state.document.content)
      );
      const nextItem = state.document.content[insertPos];

      const matchesAtStart = pastedSpeakerMatchesSpeakerAtInsertPos(state, payload, insertPos);
      const matchesAtEnd = !pastedEndsWithDifferentSpeakerThanNextItem(state, payload, insertPos);
      // matches speaker at start
      // YES: remove paragraph_start at start
      // NO: add paragraph_end at start
      if (matchesAtStart) {
        payload.content.splice(0, 1);
      } else if (nextItem) {
        payload.content.splice(0, 0, { type: 'paragraph_end', uuid: uuidv4() });
      }
      // matches speaker at end
      // YES: remove paragraph_end at end
      // NO: add paragraph_start for speaker at insertPos at end
      if (!matchesAtEnd) {
        if (nextItem && nextItem.type != 'paragraph_end') {
          payload.content.push({
            type: 'paragraph_start',
            speaker: getNotNullSpeakerNameAtIndex(state.document.content, insertPos),
            language: null,
            uuid: uuidv4(),
          });
        } else {
          state.document.content.splice(insertPos, 1);
        }
      } else if (nextItem) {
        payload.content.splice(-1, 1);
      }

      state.document.content.splice(insertPos, 0, ...payload.content);
      state.document.sources = mergedSources;
    },
    rejected: (state, payload) => {
      console.error('paste rejected:', payload);
    },
  }
);

function getLastSpeaker(content: V3DocumentItem[]): string | null {
  for (const item of content.slice().reverse()) {
    if (item.type == 'paragraph_start') {
      return item.speaker;
    }
  }
  return null;
}

function checkPastedContent(pasted: ClipboardDocument, mergedSources: Record<string, Source>) {
  if (pasted.content.length == 0) {
    return;
  }
  let inPara = false;
  for (const item of pasted.content) {
    if ('source' in item && !(item.source in mergedSources)) {
      throw new Error(`Paste failed, missing source: ${item.source}`);
    }
    if (item.type == 'paragraph_start') {
      if (inPara) {
        throw new Error('paragraph_start item encountered in paragraph');
      } else {
        inPara = true;
      }
    } else if (item.type == 'paragraph_end') {
      if (!inPara) {
        throw new Error('paragraph_end item encountered outside paragraph');
      } else {
        inPara = false;
      }
    } else if (isParagraphItem(item)) {
      if (!inPara) {
        throw new Error(
          'paragraph item encountered outside paragraph (are you missing a paragraph start?)'
        );
      }
    }
  }
  if (inPara) {
    throw new Error('missing trailing paragraph end item');
  }
}

function pastedSpeakerMatchesSpeakerAtInsertPos(
  state: EditorState,
  payload: ClipboardDocument,
  insertPos: number
): boolean {
  return (
    payload.content.length > 0 &&
    payload.content[0].type == 'paragraph_start' &&
    payload.content[0].speaker == getNotNullSpeakerNameAtIndex(state.document.content, insertPos)
  );
}

function pastedEndsWithDifferentSpeakerThanNextItem(
  state: EditorState,
  payload: ClipboardDocument,
  insertPos: number
): boolean {
  return (
    getNotNullSpeakerNameAtIndex(state.document.content, insertPos) !=
    getLastSpeaker(payload.content)
  );
}

export const copySelectionText = createAsyncActionWithReducer<EditorState>(
  'editor/copySelectionText',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (!state.selection) {
      return;
    }

    const timedDocumentSlice: V3TimedDocumentItem[] = selectedItems(state);
    const selectedText = macroItemsToText(
      memoizedMacroItems(timedDocumentSlice),
      state.document.metadata.display_speaker_names
    );

    clipboard.writeText(selectedText);
  }
);

function filterContentWordLevel(content: V3DocumentItem[], filter: RegExp): V3DocumentItem[] {
  const filteredContent: V3DocumentItem[] = [];
  let paraStart: (V3ParagraphStartItem & UuidExtension) | null = null;
  for (const item of content) {
    if (item.type == 'paragraph_start') {
      paraStart = item;
    } else if (item.type == 'paragraph_end') {
      if (paraStart === null) {
        filteredContent.push(item);
      }
    } else if (item.type == 'text' && filter.test(item.text)) {
      if (paraStart !== null) {
        filteredContent.push(paraStart);
        paraStart = null;
      }
      filteredContent.push(item);
    }
  }
  return filteredContent;
}

function paraToText(content: V3DocumentItem[]): string {
  return content
    .filter((x): x is V3TextItem & UuidExtension => x.type == 'text')
    .map((x) => x.text)
    .join(' ');
}
function filterContentParagraphLevel(content: V3DocumentItem[], filter: RegExp): V3DocumentItem[] {
  const filteredContent: V3DocumentItem[] = [];
  let para = [];
  for (const item of content) {
    if (item.type !== 'paragraph_end') {
      para.push(item);
    } else {
      const text = paraToText(para);
      if (filter.test(text)) {
        filteredContent.push(...para, item);
      }
      para = [];
    }
  }
  return filteredContent;
}

export const filterContent = createActionWithReducer<
  EditorState,
  { searchString: string; level: 'word' | 'paragraph'; caseInsensitive: boolean }
>('editor/filterContent', (state, { searchString, level, caseInsensitive }) => {
  const regex = new RegExp(searchString, caseInsensitive ? 'i' : '');
  let filteredContent: V3DocumentItem[];
  if (level == 'word') {
    filteredContent = filterContentWordLevel(state.document.content, regex);
  } else {
    filteredContent = filterContentParagraphLevel(state.document.content, regex);
  }
  if (filteredContent.length == 0) {
    filteredContent = [
      { type: 'paragraph_start', speaker: '', language: null, uuid: uuidv4() },
      { type: 'paragraph_end', uuid: uuidv4() },
    ];
  }
  state.document.content = filteredContent;
});
