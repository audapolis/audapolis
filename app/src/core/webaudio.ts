import { documentIterator, skipToTime, Document } from './document';

export const ctx = new AudioContext();

class Player {
  source: AudioBufferSourceNode;
  pauseListener: () => void;

  constructor() {
    this.source = ctx.createBufferSource();
    this.source.connect(ctx.destination);
    this.pauseListener = () => {
      // as a default, we do nothing on pause
    };
  }

  async play(
    document: Document,
    start: number,
    progressCallback: (time: number) => void
  ): Promise<void> {
    const iterator = skipToTime(start, documentIterator(document.content));
    let first = true;
    try {
      for (const item of iterator) {
        switch (item.type) {
          case 'word': {
            const timeInWord = first ? start - item.absoluteStart : 0;
            await this.playInternal(
              document.sources[item.source].decoded,
              item.start + timeInWord,
              item.end,
              progressCallback,
              item.absoluteStart + timeInWord
            );
            break;
          }
        }
        first = false;
      }
    } catch (_) {
      // errors here mean, that the we are paused, this is ok
    }
  }
  playInternal(
    buffer: AudioBuffer,
    start: number,
    end: number,
    progressCallback: (time: number) => void,
    absoluteOffset: number
  ): Promise<void> {
    this.source = ctx.createBufferSource();
    this.source.connect(ctx.destination);
    this.source.buffer = buffer;
    this.source.start(0, start, end - start);
    const startTime = ctx.currentTime;

    let playing = true;
    const callback = () => {
      progressCallback(ctx.currentTime - startTime + absoluteOffset);
      if (playing) {
        requestAnimationFrame(callback);
      }
    };
    callback();

    return new Promise((resolve, reject) => {
      this.source.onended = () => {
        resolve();
        playing = false;
      };
      this.pauseListener = () => {
        reject();
        playing = false;
      };
    });
  }
  pause() {
    this.source.stop(0);
    this.pauseListener();
  }
}
export const player = new Player();
