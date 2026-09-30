export interface Clock {
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  sleep: (ms) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
};