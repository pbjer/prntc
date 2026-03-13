import { defineConfig } from "astro/config";
import devEditor from "./src/integrations/dev-editor.ts";

const isEditor = process.env.EDITOR === "true";

export default defineConfig({
  site: "https://prntc.com",
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  integrations: isEditor ? [devEditor()] : [],
});
