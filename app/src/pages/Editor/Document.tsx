import { useDispatch, useSelector, useStore } from 'react-redux';
import { RootState } from '../../state';
import { TimedDocumentItem } from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler, MouseEventHandler, RefObject, useEffect, useRef } from 'react';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { Heading, majorScale, Pane, useTheme } from 'evergreen-ui';
import styled from 'styled-components';
import {
  moveSelectionHeadTo,
  moveSelectionHeadLeft,
  moveSelectionHeadRight,
  setSelection,
  selectAll,
} from '../../state/editor/selection';
import { goLeft, goRight, setUserIndex } from '../../state/editor/play';
import { copy, copySelectionText, deleteSomething, paste } from '../../state/editor/edit';
import { Theme } from '../../components/theme';
import {
  memoizedMacroItems,
  memoizedSpeakerIndices,
  memoizedTimedDocumentItems,
} from '../../state/editor/selectors';
import { Dispatch } from '@reduxjs/toolkit';
import { startTranscriptCorrection } from '../../state/editor/transcript_correction';
import { MenuItem, MenuSeparator, showContextMenu } from '../../components/Menu';
import { setExportPopup } from '../../state/editor/display';

const DocumentContainer = styled.div<{ displaySpeakerNames: boolean }>`
  position: relative;
  width: 100%;
  max-width: ${({ displaySpeakerNames }) => (displaySpeakerNames ? 950 : 800)}px;
  transition: max-width 0.2s;
  line-height: 1.5;
  padding: 30px 30px 200px;

  justify-content: center;

  & > * {
    overflow-x: hidden;
  }
  &:focus {
    outline: none;
  }
`;

export function Document(): JSX.Element {
  const dispatch = useDispatch();
  const content = useSelector((state: RootState) =>
    state.editor.present ? memoizedTimedDocumentItems(state.editor.present.document.content) : []
  );
  const contentMacros = memoizedMacroItems(content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';

  const editingRange = useSelector((state: RootState) => {
    if (state.editor.present?.transcriptCorrectionState != null) {
      return state.editor.present?.selection;
    } else {
      return null;
    }
  });

  const speakerColorIndices = memoizedSpeakerIndices(contentMacros);
  const ref = useRef<HTMLDivElement>(null);
  const theme: Theme = useTheme();

  useEffect(() => {
    ref.current && ref.current.focus();
  }, [ref.current]);

  const disableMouseMove = useRef(false); // this is a hack to counter some unintuitive behaviour after opening the context menu

  const mouseDownHandler: MouseEventHandler = (e) => {
    e.preventDefault();
    if (e.buttons != 1 || e.detail != 1) {
      return;
    }

    disableMouseMove.current = false;

    ref.current?.focus(); // sometimes we loose focus and then it is nice to be able to gain it back

    if (!e.shiftKey) {
      handleWordClick(dispatch, content, e);
    } else if (e.shiftKey) {
      const index = indexAtPosition(content, e.clientX, e.clientY, 50);
      if (index) {
        dispatch(moveSelectionHeadTo(index));
      }
    }
  };

  const store = useStore();
  const getState = (): RootState => store.getState();
  const contextMenuHandler: MouseEventHandler = (e) => {
    e.preventDefault();
    if (!getState().editor.present?.selection) {
      const index = indexAtPosition(content, e.clientX, e.clientY, 100);
      if (index) {
        dispatch(setSelection({ startIndex: index, length: 1, headPosition: 'left' }));
      }
    }

    disableMouseMove.current = true;
    if (getState().editor.present?.selection) {
      showContextMenu(
        <>
          <MenuItem
            label={'Correct Transcript of Selection'}
            accelerator={'i'}
            callback={() => dispatch(startTranscriptCorrection('left'))}
          />
          <MenuItem
            label={'Export Selection'}
            callback={() => dispatch(setExportPopup('selection'))}
          />

          <MenuSeparator />

          <MenuItem
            label={'Select All'}
            accelerator={'CmdOrCtrl+A'}
            callback={() => dispatch(selectAll())}
          />
          <MenuItem label={'Copy Text'} callback={() => dispatch(copySelectionText())} />
          <MenuItem
            label={'Copy Content'}
            accelerator={'CmdOrCtrl+C'}
            callback={() => dispatch(copy())}
          />
          <MenuItem
            label={'Paste replacing Selection'}
            callback={() => dispatch(paste())}
            accelerator={'CmdOrCtrl+V'}
          />
        </>
      );
    } else {
      showContextMenu(
        <>
          <MenuItem
            label={'Select All'}
            accelerator={'CmdOrCtrl+A'}
            callback={() => dispatch(selectAll())}
          />
          <MenuItem
            label={'Paste at Cursor Position'}
            callback={() => dispatch(paste())}
            accelerator={'CmdOrCtrl+V'}
          />
        </>
      );
    }
  };

  const mouseMoveHandler: MouseEventHandler = (e) => {
    if (e.buttons != 1 || disableMouseMove.current) return;
    e.preventDefault();

    const index = indexAtPosition(content, e.clientX, e.clientY);
    if (index) {
      dispatch(moveSelectionHeadTo(index));
    }
  };

  const keyDownHandler: KeyboardEventHandler = (e) => {
    if (e.key === 'Backspace') {
      dispatch(deleteSomething('left'));
    } else if (e.key === 'Delete') {
      dispatch(deleteSomething('right'));
    } else if (e.key == 'ArrowLeft' && e.shiftKey) {
      dispatch(moveSelectionHeadLeft());
      e.preventDefault();
    } else if (e.key == 'ArrowRight' && e.shiftKey) {
      dispatch(moveSelectionHeadRight());
      e.preventDefault();
    } else if (e.key == 'ArrowLeft') {
      dispatch(goLeft());
    } else if (e.key == 'ArrowRight') {
      dispatch(goRight());
    } else if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
      // TODO: handle properly (see: https://github.com/audapolis/audapolis/issues/228)
      e.preventDefault();
    } else if (e.key == 'i') {
      e.preventDefault();
      dispatch(startTranscriptCorrection('left'));
    } else if (e.key == 'o') {
      e.preventDefault();
      dispatch(startTranscriptCorrection('right'));
    }
  };
  function getSpeakerColor(speaker: string | null) {
    if (speaker == null) return theme.colors.muted;
    const color_idx = speakerColorIndices[speaker] % Object.keys(theme.colors.speakers).length;
    return theme.colors.speakers[color_idx];
  }

  return (
    <DocumentContainer
      id={'document'}
      ref={ref}
      displaySpeakerNames={displaySpeakerNames}
      onMouseDown={mouseDownHandler}
      onContextMenu={contextMenuHandler}
      onMouseMove={mouseMoveHandler}
      tabIndex={1}
      onKeyDown={keyDownHandler}
    >
      <Cursor />
      <SelectionApply documentRef={ref} />

      <Pane display={'flex'} flexDirection={'row'} marginBottom={majorScale(4)}>
        <Pane
          width={displaySpeakerNames ? 150 : 0}
          transition={'width .2s'}
          flexShrink={0}
          marginRight={majorScale(1)}
        />
        <FileNameDisplay path={fileName} />
      </Pane>

      {contentMacros.map((p, i) => {
        switch (p.type) {
          case 'paragraph': {
            const speakerColor = getSpeakerColor(p.speaker);
            // TODO: This is a lie that only works because we do not show headings yet.
            //  Once headings are supported, this needs to be better
            const paraBreak = contentMacros[i + 1];
            const paraBreakIdx = paraBreak !== undefined ? paraBreak.absoluteIndex : content.length;
            return (
              <Paragraph
                key={i}
                data={p}
                color={speakerColor}
                displaySpeakerNames={displaySpeakerNames}
                paraBreakIdx={paraBreakIdx}
                editingRange={editingRange}
              />
            );
          }
          case 'heading': {
            console.error('TODO');
            return <></>;
          }
        }
      })}
    </DocumentContainer>
  );
}

function shouldPlaceCursorLeft(x: number, y: number, elem: Element, leftPercentage = 50): boolean {
  const clientRects = elem.getClientRects();
  if (clientRects.length == 1) {
    const rect = clientRects[0];
    return x < rect.left + (rect.right - rect.left) * (leftPercentage / 100);
  } else if (clientRects.length > 1) {
    const rect = clientRects[1];
    return rect.top > y;
  } else {
    return false;
  }
}

function handleWordClick(dispatch: Dispatch, content: TimedDocumentItem[], e: React.MouseEvent) {
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return;
  const nodeLength = range.startContainer.textContent?.length;
  if (nodeLength != null) {
    const parent = range.startContainer.parentElement;
    const placeLeft = parent == null ? false : shouldPlaceCursorLeft(e.clientX, e.clientY, parent);
    dispatch(setSelection(null));
    const item = itemFromNode(content, range.startContainer, range.startOffset);
    if (item) {
      const idx = item.absoluteIndex + (placeLeft ? 0 : 1);
      dispatch(setUserIndex(idx));
    }
  }
}

const getAbsoluteItemIndex = (element: HTMLElement | null) =>
  parseInt(element?.id?.replace('item-', '') || '');

const getItem = (
  content: TimedDocumentItem[],
  element: HTMLElement | null
): TimedDocumentItem | null => {
  const itemIdx = getAbsoluteItemIndex(element);
  return content[itemIdx];
};

function indexAtPosition(
  content: TimedDocumentItem[],
  x: number,
  y: number,
  leftPercentage = 50
): number | undefined {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return;
  const item = itemFromNode(content, range.startContainer, range.startOffset);
  if (!item) return;

  const parent = range.startContainer.parentElement;
  const placeLeft = parent == null ? false : shouldPlaceCursorLeft(x, y, parent, leftPercentage);
  const off = placeLeft ? 0 : 1;
  return item.absoluteIndex + off;
}

const itemFromNode = (content: TimedDocumentItem[], node: Node, n = 0) => {
  const child = getChild(node, n);
  let itemElement = child?.parentElement;
  while (itemElement) {
    if (itemElement.id.match(/item-/)) break;
    else itemElement = itemElement?.parentElement;
  }
  return getItem(content, itemElement);
};
function SelectionApply({ documentRef }: { documentRef: RefObject<HTMLDivElement> }): JSX.Element {
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const transcriptCorrectionState = useSelector(
    (state: RootState) => state.editor.present?.transcriptCorrectionState
  );
  const exportPopupState = useSelector((state: RootState) => state.editor.present?.exportPopup);

  useEffect(() => {
    if (selection) {
      const start = document.getElementById(`item-${selection.startIndex}`);
      const end = document.getElementById(`item-${selection.startIndex + selection.length}`);
      if (start && end) {
        if (selection.headPosition == 'left') {
          window.getSelection()?.setBaseAndExtent(start, 0, end, 0);
        } else {
          window.getSelection()?.setBaseAndExtent(end, 0, start, 0);
        }
      } else {
        window.getSelection()?.removeAllRanges();
      }
    } else {
      window.getSelection()?.removeAllRanges();
    }
  }, [
    selection?.startIndex,
    selection?.length,
    selection?.headPosition,
    documentRef.current,
    transcriptCorrectionState,
    exportPopupState,
  ]);
  return <></>;
}

function getChild(element: Node, n = 0): Node {
  return element?.childNodes.item(n) ? getChild(element?.childNodes.item(n)) : element;
}

function FileNameDisplay({ path }: { path: string }) {
  const extension = extname(path);
  const base = basename(path, extension);

  return (
    <Heading userSelect={'none'} fontWeight={400} size={600}>
      {base}
      <span style={{ fontWeight: 200 }}>{extension}</span>
    </Heading>
  );
}
