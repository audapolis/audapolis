import * as React from 'react';
import { Button, IconButton, Link } from '../components/Controls';
import { useDispatch } from 'react-redux';
import { transcribeFile } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn } from '../components/Util';
import styled from 'styled-components';
import { MdHelp, MdSettings } from 'react-icons/md';
import { openModelManager } from '../state/nav';
import { openDocumentFromDisk, openDocumentFromMemory } from '../state/editor';
import { Joyride, resetJoyride } from '../components/Joyride';
import { shell } from 'electron';

const BottomRightContainer = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px;
  & > * {
    margin: 5px;
  }
`;
export function LandingPage(): JSX.Element {
  const dispatch = useDispatch();

  const steps = [
    {
      target: 'body',
      placement: 'center' as const,
      content: (
        <div>
          <h1>Welcome to audapolis!</h1>
          <p>
            This short introduction will guide you through the basic features and get you up to
            speed.
          </p>
        </div>
      ),
    },
    {
      target: 'body',
      placement: 'center' as const,
      content: (
        <div>
          <p>
            It would be really nice if you could help us out by answering{' '}
            <Link
              onClick={() =>
                shell.openExternal(
                  'https://docs.google.com/forms/d/e/1FAIpQLSerdLMYw3C3sfCyliGTal_CfeH5_jw4l2Zv-NmYc8GEabpHnA/viewform'
                )
              }
            >
              our short survey
            </Link>{' '}
            about your needs & expectations so that we can build actually usefull software and know
            what you need.
          </p>
        </div>
      ),
    },
    {
      target: '#import',
      content: (
        <p>
          You can import your media files here. They will automatically be transcribed later. You
          can for example start with your favourite speech.
        </p>
      ),
    },
  ];

  return (
    <AppContainer>
      <Joyride steps={steps} page={'landing'} />
      <TitleBar />
      <MainCenterColumn>
        <Button primary onClick={() => dispatch(transcribeFile())} id={'import'}>
          Import & Transcribe
        </Button>
        <Button primary onClick={() => dispatch(openDocumentFromDisk())}>
          Open Existing
        </Button>
        <Button onClick={() => dispatch(openDocumentFromMemory({ sources: {}, content: [] }))}>
          New Blank Document
        </Button>
      </MainCenterColumn>
      <BottomRightContainer>
        <IconButton
          icon={MdHelp}
          onClick={() => {
            resetJoyride();
          }}
          text={'restart help tour'}
        />
        <IconButton
          icon={MdSettings}
          onClick={() => dispatch(openModelManager())}
          text={'manage transcription models'}
        />
      </BottomRightContainer>
    </AppContainer>
  );
}
