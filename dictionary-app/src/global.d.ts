export {};

declare global {
  interface Window {
    api: {
      search: (query: string) => any[];
      getWord: (word: string) => any;
    };
  }
}
