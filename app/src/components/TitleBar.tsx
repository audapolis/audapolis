import styled from 'styled-components';
import * as React from 'react';
import { platform } from 'os';
import { CrossIcon, MenuIcon, Heading, IconButton } from 'evergreen-ui';
import { showMenuBar } from '../../ipc/ipc_renderer';

function getWindowControlsRect(): DOMRect {
  const windowControlsOverlay = window.navigator.windowControlsOverlay;
  if (windowControlsOverlay.visible) {
    return windowControlsOverlay.getBoundingClientRect();
  } else {
    return new DOMRect(55, 0, window.innerWidth - 2 * 55, 55);
  }
}
function WindowControlsButton({
  doRender,
  side,
  icon,
  onClick,
}: {
  doRender: boolean;
  side: 'left' | 'right';
  icon: React.ElementType;
  onClick: () => void;
}) {
  if (!doRender) {
    return <></>;
  } else {
    const rect = getWindowControlsRect();
    return (
      <IconButton
        iconSize={16}
        width={rect.x}
        height={rect.height}
        position={'absolute'}
        top={0}
        {...{ [side]: 0 }}
        style={{ WebkitAppRegion: 'no-drag' }}
        appearance={'minimal'}
        onClick={onClick}
        icon={icon}
      />
    );
  }
}

const TitleBarContainer = styled.div`
  height: 55px;
  flex-shrink: 0;
  padding: 0 ${getWindowControlsRect().left}px;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;

  -webkit-app-region: drag;
  -webkit-user-select: none;
`;

export function TitleBar({ children }: { children?: React.ReactNode }): JSX.Element {
  if (!children) {
    children = (
      <Heading is={'h1'} fontWeight={'normal'}>
        audapolis
      </Heading>
    );
  }

  return (
    <TitleBarContainer>
      <WindowControlsButton
        doRender={platform() != 'darwin'}
        side={'left'}
        onClick={() => {
          showMenuBar();
        }}
        icon={MenuIcon}
      />
      <WindowControlsButton
        doRender={!window.navigator.windowControlsOverlay.visible}
        side={'right'}
        icon={CrossIcon}
        onClick={() => {
          window.close();
        }}
      />

      {children}
    </TitleBarContainer>
  );
}

export const TitleBarSection = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 0;
  flex-grow: 1;
  justify-content: space-evenly;
`;

export const TitleBarGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
  & > * {
    margin: 0 5px;
    -webkit-app-region: no-drag;
  }
`;
