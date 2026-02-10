/// <reference types="vite/client" />

declare namespace NodeJS {
  type Timeout = number;
}

declare const process: {
  env: Record<string, string | undefined>;
};
