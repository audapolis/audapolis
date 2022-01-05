import * as React from 'react';
import { AppContainer, BackButton, MainMaxWidthContainer } from '../components/Util';
import { TitleBar } from '../components/TitleBar';
import * as fs from 'fs';
import JSZip from 'jszip';
import { useState } from 'react';
import { ipcRenderer } from 'electron';
import pf_funding_svg from '../../../doc/pf_funding_logos.svg';
import { Heading, Link, majorScale, Paragraph } from 'evergreen-ui';

function openLicenses() {
  const data = fs.readFileSync('generated/licenses.zip');
  JSZip.loadAsync(data).then((zip) =>
    zip
      .file('licenses.txt')
      ?.async('text')
      .then((x) => {
        ipcRenderer.invoke('open-text-in-system', {
          name: 'licenses.txt',
          text: x,
        });
      })
  );
}

export function AboutPage(): JSX.Element {
  const [aboutData, setAboutData] = useState({ version: 'n/a' });

  ipcRenderer.invoke('get-about').then((x) => setAboutData(x));

  return (
    <AppContainer>
      <TitleBar />
      <MainMaxWidthContainer width={500} centerVertically>
        <Heading>About audapolis</Heading>
        <Paragraph marginBottom={majorScale(2)}>Version: {aboutData.version}</Paragraph>

        <Paragraph>
          Audapolis would not be possible without a large number of open source components. A list
          of all used components and their license can be found here:{' '}
          <Link onClick={openLicenses}>Open Acknowledgements</Link>
        </Paragraph>
        <Paragraph>
          Audapolis is founded from September 2021 until February 2022 by
          <img
            src={pf_funding_svg}
            alt='logos of the "Bundesministerium für Bildung und Forschung", Prodotype Fund and OKFN-Deutschland'
          />
        </Paragraph>
        <BackButton />
      </MainMaxWidthContainer>
    </AppContainer>
  );
}
