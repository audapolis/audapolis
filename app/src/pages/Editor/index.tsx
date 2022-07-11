import * as React from 'react';
import { AppContainer, MainCenterColumn } from '../../components/Util';
import styled from 'styled-components';
import { EditorTitleBar } from './TitleBar';
import { Document } from './Document';
import { Player } from './Player';
import { KeyboardEventHandler } from 'react';
import { useDispatch } from 'react-redux';
import { ExportDocumentDialog } from './ExportDocumentDialog';
import { EditorTour } from '../../tour/EditorTour';
import { togglePlaying } from '../../state/editor/play';
import { insertParagraphEnd } from '../../state/editor/edit';
import { EditorMenuBar } from './MenuBar';
import { FilterDialog } from './Filter';

const MainContainer = styled(MainCenterColumn)`
  justify-content: start;
  overflow-y: auto !important;

  &:focus {
    outline: none;
  }
`;
export function EditorPage(): JSX.Element {
  const dispatch = useDispatch();
  const handleKeyPress: KeyboardEventHandler = (e) => {
    if (e.key === ' ') {
      dispatch(togglePlaying());
      e.preventDefault();
    } else if (e.key === 'Enter') {
      dispatch(insertParagraphEnd());
    }
  };

  return (
    <AppContainer tabIndex={-1} onKeyDown={handleKeyPress} ref={(ref) => ref?.focus()}>
      <EditorMenuBar />
      <EditorTour />
      <Player />

      <EditorTitleBar />
      <ExportDocumentDialog />
      <FilterDialog />

      <MainContainer id={'scroll-container'}>
        <Document />
      </MainContainer>
    </AppContainer>
  );
}
