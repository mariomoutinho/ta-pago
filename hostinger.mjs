// Entry file for a managed Node.js application. The web bundle lives in dist/.
import { tsImport } from "tsx/esm/api";
await tsImport("./server/index.ts", import.meta.url);
