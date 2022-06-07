import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { closeDocument, openDocumentFromDisk, saveDocument } from '../../state/editor/io';
import { transcribeFile } from '../../state/transcribe';
import { ActionCreators } from 'redux-undo';
import { copy, cut, paste } from '../../state/editor/edit';
import { selectAll } from '../../state/editor/selection';
import {
  toggleDisplayConfidence,
  toggleDisplaySpeakerNames,
  toggleDisplayVideo,
} from '../../state/editor/display';
import React from 'react';
import { MenuBar, MenuCheckbox, MenuGroup, MenuItem, MenuSeparator } from '../../components/Menu';

export function EditorMenuBar(): JSX.Element {
  const dispatch = useDispatch();
  const displaySpeakerNames = useSelector(
    (state: RootState) => state.editor.present?.displaySpeakerNames || false
  );
  const displayVideo = useSelector(
    (state: RootState) => state.editor.present?.displayVideo || false
  );
  const displayConfidence = useSelector(
    (state: RootState) => state.editor.present?.displayConfidence || false
  );

  return (
    <MenuBar>
      <MenuGroup label={'File'}>
        <MenuItem
          callback={() => dispatch(openDocumentFromDisk())}
          accelerator={'CommandOrControl+O'}
          label={'Open'}
        />
        <MenuItem
          callback={() => dispatch(transcribeFile())}
          accelerator={'CommandOrControl+I'}
          label={'Import & Transcribe'}
        />

        <MenuSeparator />

        <MenuItem
          callback={() => dispatch(saveDocument(false))}
          accelerator={'CommandOrControl+S'}
          label={'Save'}
        />
        <MenuItem
          callback={() => dispatch(saveDocument(true))}
          accelerator={'CommandOrControl+Shift+S'}
          label={'Save As...'}
        />
        <MenuSeparator />

        <MenuItem
          callback={() => dispatch(closeDocument())}
          accelerator={'CommandOrControl+Shift+W'}
          label={'Close Document'}
        />
      </MenuGroup>
      <MenuGroup label={'Edit'}>
        <MenuItem
          label={'Undo'}
          callback={() => dispatch(ActionCreators.undo())}
          accelerator={'CommandOrControl+Z'}
        />
        <MenuItem
          label={'Redo'}
          callback={() => dispatch(ActionCreators.redo())}
          accelerator={'CommandOrControl+Shift+Z, CommandOrControl+Y'}
        />
        <MenuItem
          label={'Cut'}
          callback={() => dispatch(cut())}
          accelerator={'CommandOrControl+X'}
        />
        <MenuItem
          label={'Copy'}
          callback={() => dispatch(copy())}
          accelerator={'CommandOrControl+C'}
        />
        <MenuItem
          label={'Paste'}
          callback={() => dispatch(paste())}
          accelerator={'CommandOrControl+V'}
        />

        <MenuSeparator />

        <MenuItem
          label={'Select All'}
          callback={() => dispatch(selectAll())}
          accelerator={'CommandOrControl+A'}
        />
      </MenuGroup>
      <MenuGroup label={'View'}>
        <MenuCheckbox
          label={'Display Speaker Names'}
          checked={displaySpeakerNames}
          callback={() => dispatch(toggleDisplaySpeakerNames())}
        />
        <MenuCheckbox
          label={'Display Video'}
          checked={displayVideo}
          callback={() => dispatch(toggleDisplayVideo())}
        />
        <MenuCheckbox
          label={'Highlight low confidence transcript'}
          checked={displayConfidence}
          callback={() => dispatch(toggleDisplayConfidence())}
        />
      </MenuGroup>
    </MenuBar>
  );
}
