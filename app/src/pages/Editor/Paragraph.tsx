import styled, { css } from 'styled-components';
// eslint-disable-next-line import/no-unresolved
import quarterRest from '../../resources/quarter_rest.svg?raw';
import * as React from 'react';
import { DetailedHTMLProps, HTMLAttributes, MouseEventHandler, useRef, useState } from 'react';
import { ParagraphGeneric, TimedParagraphItem } from '../../core/document';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import {
  mouseSelectionEnd,
  mouseSelectionOver,
  mouseSelectionStart,
  setTime,
  play,
  pause,
  selectItem,
  selectParagraph,
  setWord,
  reassignParagraph,
  renameSpeaker,
} from '../../state/editor';
import { Button, Popup } from '../../components/Controls';
import { assertSome } from '../../util';

const ParagraphContainer = styled.div`
  user-select: none;
`;
const LongSilenceSpan = styled.span<{ selected: boolean; icon: string }>`
  padding: 0 8px;
  color: transparent;
  background: center / auto 80% no-repeat url(${(props) => props.icon});
  ${(props) =>
    props.selected &&
    css`
      background-color: lightblue;
    `}
`;

function LongSilence(
  props: { selected: boolean; color: string } & HTMLAttributes<HTMLSpanElement>
): JSX.Element {
  const dataUri =
    'data:image/svg+xml;base64,' + btoa(quarterRest.replaceAll('#000000', props.color));
  return (
    <LongSilenceSpan className={'item'} icon={dataUri} {...props}>
      {' '}
    </LongSilenceSpan>
  );
}

function ShortSilence(props: { selected: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={'item'}
      style={props.selected ? { backgroundColor: 'lightblue' } : {}}
      {...props}
    >
      {' '}
    </span>
  );
}

export function Word({
  word,
  selected,
  changehandler,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & {
  word: string;
  selected: boolean;
  changehandler: (x: string) => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const startEditing = () => {
    console.log('ref current', ref.current);
    setEditing(true);
    const range = document.createRange();
    assertSome(ref.current);
    range.selectNodeContents(ref.current);
    const sel = window.getSelection();
    assertSome(sel);
    sel.removeAllRanges();
    sel.addRange(range);
    setTimeout(function () {
      ref.current?.focus();
    }, 0);
  };

  const stopEditing = () => {
    setEditing(false);
    const text = ref.current?.innerText;
    assertSome(text);
    if (text != word) {
      changehandler(text);
    }
  };
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (editing) {
      stopEditing();
    } else {
      startEditing();
    }
  };
  const editableProps = editing
    ? {
        onKeyDown: (e: React.KeyboardEvent) => {
          e.stopPropagation();
          if (e.key == 'Enter') {
            stopEditing();
          }
        },
        contentEditable: editing,
        suppressContentEditableWarning: true,
        onBlur: () => {
          stopEditing();
        },
      }
    : {};

  return (
    <SelectableSpan selected={selected}>
      {' '}
      <span {...props} {...editableProps} ref={ref} onContextMenu={handleContextMenu}>
        {word}
      </span>
    </SelectableSpan>
  );
}

const SelectableSpan = styled.span<{ selected: boolean }>`
  ${(props) =>
    props.selected &&
    css`
      background-color: lightblue;
      color: black;
    `}
`;

const SpeakerPopupButton = styled(Button)`
  border: none;
  display: block;
  padding: 10px;
  width: 100%;
  margin: 0;
  &:hover {
    background: ${({ theme }) => theme.fg.alpha(0.3).toString()};
  }
`;

enum EditingType {
  Reassign,
  Rename,
}
type SpeakerEditing = null | {
  type: EditingType;
  currentText: string;
  isNew: boolean;
};

const SpeakerInput = styled.input`
  width: 100%;
  font-size: inherit;
`;
const SpeakerLabel = styled.div`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;
function Speaker(
  props: HTMLAttributes<HTMLDivElement> & { name: string; paragraphIdx: number }
): JSX.Element {
  const [editing, setEditing] = useState(null as SpeakerEditing);
  const dispatch = useDispatch();

  if (!editing) {
    return (
      <div {...props}>
        <Popup
          trigger={() => <SpeakerLabel>{props.name}</SpeakerLabel>}
          position={['right center', 'bottom center', 'top center']}
          on={['click']}
        >
          <SpeakerPopupButton
            onClick={() =>
              setEditing({ isNew: true, type: EditingType.Rename, currentText: props.name })
            }
          >
            Rename Speaker
          </SpeakerPopupButton>
          <SpeakerPopupButton
            onClick={() =>
              setEditing({ isNew: true, type: EditingType.Reassign, currentText: props.name })
            }
          >
            Reassign Speaker
          </SpeakerPopupButton>
        </Popup>
      </div>
    );
  } else {
    return (
      <div {...props}>
        <SpeakerInput
          value={editing.currentText}
          ref={(ref) => {
            if (editing.isNew) {
              ref?.focus();
              ref?.select();
              setEditing({ ...editing, isNew: false });
            }
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key == 'Enter') {
              if (editing.type == EditingType.Reassign) {
                dispatch(
                  reassignParagraph({
                    paragraphIdx: props.paragraphIdx,
                    newSpeaker: editing.currentText,
                  })
                );
              } else if (editing.type == EditingType.Rename) {
                dispatch(renameSpeaker({ oldName: props.name, newName: editing.currentText }));
              }
              setEditing(null);
            } else if (e.key == 'Escape') {
              setEditing(null);
            }
          }}
          onChange={(e) => {
            setEditing({ ...editing, currentText: e.target.value });
          }}
          onBlur={() => {
            setEditing(null);
          }}
        />
      </div>
    );
  }
}

export function Paragraph({
  speaker,
  content,
  paragraphIdx,
  color,
}: ParagraphGeneric<TimedParagraphItem> & { paragraphIdx: number; color: string }): JSX.Element {
  const playing = useSelector((state: RootState) => state.editor.present?.playing) || false;
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const dispatch = useDispatch();
  const isSelected = (item: TimedParagraphItem) => {
    if (!selection) {
      return false;
    } else {
      return (
        item.absoluteStart >= selection.start &&
        item.absoluteStart + item.length <= selection.start + selection.length
      );
    }
  };

  return (
    <>
      <Speaker name={speaker} paragraphIdx={paragraphIdx} style={{ color: color }} />
      <ParagraphContainer style={{ color: color }}>
        {content.map((item, i) => {
          const onClick = async () => {
            await dispatch(pause());
            await dispatch(setTime(item.absoluteStart));
            if (playing) {
              dispatch(play());
            }
          };
          const onMouseDown: MouseEventHandler = (e) => {
            if (e.button !== 0) {
              // we only want to handle left clicks
              return;
            }
            dispatch(mouseSelectionStart(item));
            const listener = (e: MouseEvent) => {
              dispatch(mouseSelectionEnd());
              e.target?.removeEventListener('click', listener);
              document.removeEventListener('click', listener);
              if (e.detail == 2) {
                dispatch(selectItem(item));
              } else if (e.detail == 3) {
                dispatch(selectParagraph(item));
              }
            };
            e.target.addEventListener('click', listener, { once: true });
            document.addEventListener('click', listener, { once: true });
          };
          const onMouseMove: MouseEventHandler = () => {
            dispatch(mouseSelectionOver(item));
          };
          const commonProps = {
            onClick,
            onMouseDown,
            onMouseMove,
            selected: isSelected(item),
            className: 'item',
            key: i,
            changehandler: (text: string) => {
              dispatch(setWord({ text, absoluteStart: item.absoluteStart }));
            },
          };
          switch (item.type) {
            case 'word':
              return <Word {...commonProps} word={item.word} />;
            case 'silence':
              if (item.length > 0.4) {
                return <LongSilence {...commonProps} color={color} selected={isSelected(item)} />;
              } else {
                return <ShortSilence key={i} onClick={onClick} selected={isSelected(item)} />;
              }
            case 'artificial_silence':
              if (item.length > 0.4) {
                return <LongSilence {...commonProps} color={color} selected={isSelected(item)} />;
              } else {
                return <ShortSilence key={i} onClick={onClick} selected={isSelected(item)} />;
              }
          }
        })}
      </ParagraphContainer>
    </>
  );
}
