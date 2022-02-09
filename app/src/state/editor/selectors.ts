// - [x] currentItem
// - document as render items
// - [x] playback relevant items (media, transition)
// - as paragraphs
// - [x] items in selection
// - [x] document with timed items
// - [x] current cursor time

import { EditorState } from './types';
import {
  DocumentItem,
  HeadingItem,
  Paragraph,
  ParagraphBreakItem,
  ParagraphItem,
  RenderItem,
  TimedDocumentItem,
  TimedItemExtension,
  TimedMacroItem,
  TimedParagraphItem,
} from '../../core/document';
import _, { times } from 'lodash';
import memoize from 'proxy-memoize';
import { assertUnreachable, roughEq } from '../../util';

export const timedDocumentItems = memoize((content: DocumentItem[]): TimedDocumentItem[] => {
  let absoluteTime = 0;
  return content.map((item, idx) => {
    const timedItem = { ...item, absoluteStart: absoluteTime, absoluteIndex: idx };
    if ('length' in item) {
      absoluteTime += item.length;
    }
    return timedItem;
  });
});

export const currentItem = memoize((state: EditorState): TimedDocumentItem => {
  const timedItems = timedDocumentItems(state.document.content);
  switch (state.cursor.current) {
    case 'user':
      return timedItems[state.cursor.userIndex];
    case 'player': {
      const currentTime = currentCursorTime(state);
      const currentIndex =
        _.sortedLastIndexBy<{ absoluteStart: number }>(
          timedItems,
          { absoluteStart: currentTime },
          (item) => item.absoluteStart
        ) - 1;
      return timedItems[currentIndex];
    }
  }
});

export const currentCursorTime = memoize((state: EditorState): number => {
  switch (state.cursor.current) {
    case 'player':
      return state.cursor.playerTime;
    case 'user':
      return currentItem(state).absoluteStart;
  }
});

export const selectedItems = memoize((state: EditorState): TimedDocumentItem[] => {
  if (!state.selection) {
    return [];
  } else {
    return timedDocumentItems(state.document.content).slice(
      state.selection.startIndex,
      state.selection.startIndex + state.selection.length
    );
  }
});

export const paragraphItems = memoize((content: DocumentItem[]): TimedParagraphItem[] => {
  return filterTimedParagraphItems(timedDocumentItems(content));
});

const getRenderType = (type: 'silence' | 'artificial_silence' | 'word'): 'media' | 'silence' => {
  switch (type) {
    case 'word':
    case 'silence':
      return 'media';
    case 'artificial_silence':
      return 'silence';
  }
};

const isSameSource = (
  item1: { type: string; source?: string },
  item2: { type: string; source?: string }
): boolean => {
  return item1.source === item2.source;
};

function isSubsequentSourceSegment(
  current: { type: string; sourceStart?: number; length: number },
  item: { type: string; sourceStart?: number }
): boolean {
  if (current.sourceStart == undefined || item.sourceStart == undefined) {
    // This means that both current and item are artificial silences
    return current.sourceStart == undefined && item.sourceStart == undefined;
  } else {
    return roughEq(current.sourceStart + current.length, item.sourceStart);
  }
}

export const renderItems = memoize((content: DocumentItem[]): RenderItem[] => {
  const timedContent = timedDocumentItems(content);
  const items = [];
  let current: RenderItem | null = null;
  let current_speaker: string | null = null;
  for (const item of timedContent) {
    if (item.type == 'heading') {
      continue;
    }
    if (item.type == 'paragraph_break') {
      current_speaker = item.speaker;
    } else if (
      !current ||
      getRenderType(item.type) != current.type ||
      !isSubsequentSourceSegment(current, item) ||
      !isSameSource(current, item) ||
      ('speaker' in current && current_speaker != current.speaker)
    ) {
      if (current) {
        items.push(current);
      }
      current = null;
      switch (item.type) {
        case 'silence':
        case 'word': {
          const { absoluteStart, length, sourceStart, source } = item;
          if (current_speaker === null) {
            throw new Error(
              'ParagraphItem encountered before first paragraph break. What is the speaker?'
            );
          }
          current = {
            type: 'media',
            absoluteStart,
            length,
            sourceStart,
            source,
            speaker: current_speaker,
          };
          break;
        }
        case 'artificial_silence': {
          const { absoluteStart, length } = item;
          current = {
            type: 'silence',
            absoluteStart,
            length,
          };
          break;
        }
        default:
          assertUnreachable(item);
      }
    } else {
      current.length = item.absoluteStart - current.absoluteStart + item.length;
    }
  }
  if (current) {
    items.push(current);
  }
  return items;
});

const isTimedParagraphItem = (item: TimedDocumentItem): item is TimedParagraphItem =>
  ['word', 'silence', 'artificial_silence'].indexOf(item.type) >= 0;

const filterTimedParagraphItems = (content: TimedDocumentItem[]): TimedParagraphItem[] =>
  content.filter(isTimedParagraphItem);

export const macroItems = memoize((content: DocumentItem[]): TimedMacroItem[] => {
  const timedContent = timedDocumentItems(content);
  for (const item of timedContent) {
    if (item.type == 'paragraph_break') {
      break;
    } else if (isTimedParagraphItem(item)) {
      throw new Error('ParagraphItem encountered before first paragraph break.');
    }
  }
  const macroItems = timedContent
    .filter(
      (item): item is (ParagraphBreakItem | HeadingItem) & TimedItemExtension =>
        item.type == 'paragraph_break' || item.type == 'heading'
    )
    .map((item, idx, arr) => {
      switch (item.type) {
        case 'heading':
          return item;
        case 'paragraph_break': {
          const start = item.absoluteIndex;
          const end = arr[idx + 1]?.absoluteIndex || timedContent.length;
          const { speaker, absoluteStart, absoluteIndex } = item;
          return {
            type: 'paragraph',
            speaker,
            content: filterTimedParagraphItems(timedContent.slice(start, end)),
            absoluteIndex,
            absoluteStart,
          };
        }
      }
    });
  return macroItems;
});

export const currentSpeaker = memoize((state: EditorState): string | null => {
  const curItem = currentItem(state);
  const timedItems = timedDocumentItems(state.document.content);
  for (let idx = curItem.absoluteIndex - 1; idx >= 0; idx--) {
    const idxItem = timedItems[idx];
    if (idxItem.type == 'paragraph_break') {
      return idxItem.speaker;
    }
  }
  return null;
});
