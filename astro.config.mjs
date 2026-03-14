import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import devEditor from "./src/integrations/dev-editor.ts";

const isEditor = process.env.EDITOR === "true";

export default defineConfig({
  site: "https://prntc.com",
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  integrations: [mdx(), ...(isEditor ? [devEditor()] : [])],
  vite: {
    build: {
      rollupOptions: {
        external: isEditor ? [] : ["editor", "editor/checkbox.css", "editor/folding.css"],
      },
    },
  },
});
