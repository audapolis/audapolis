import * as React from 'react';
import { useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn, MainMaxWidthContainer } from '../components/Util';
import { RootState } from '../state';
import { Line } from 'rc-progress';
import * as path from 'path';
import { FormField, majorScale, Pane, Text } from 'evergreen-ui';

export function TranscribingPage(): JSX.Element {
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const progress =
    useSelector((state: RootState) => state.transcribe.processed / state.transcribe.total) || 0;
  const server_state = useSelector((state: RootState) => state.transcribe.state) || '';

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <MainMaxWidthContainer width={500}>
          <FormField label="Transcribing File" marginBottom={majorScale(3)}>
            <Text color="muted">{path.basename(file)}</Text>
          </FormField>

          <Line percent={progress * 100} style={{ width: '100%' }} />
          <Pane textAlign={'center'} marginBottom={majorScale(4)}>
            <Text color={'muted'}>{(progress * 100).toFixed(0)}&nbsp;%</Text>
            <Text color={'muted'} width={100} display={'inline-block'} textAlign={'left'}>
              &nbsp;-&nbsp;{server_state}
            </Text>
          </Pane>
        </MainMaxWidthContainer>
      </MainCenterColumn>
    </AppContainer>
  );
}
