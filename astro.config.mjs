import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://prntc.com",
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
});
