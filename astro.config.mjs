import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pbjer.github.io",
  base: "/prntc",
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
});
