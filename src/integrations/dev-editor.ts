import type { AstroIntegration } from "astro";
import { readdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function collectBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

export default function devEditor(): AstroIntegration {
  let contentDir: string;

  return {
    name: "dev-editor",
    hooks: {
      "astro:config:done": ({ config }) => {
        contentDir = join(fileURLToPath(config.root), "src/content/writing");
      },

      "astro:server:setup": ({ server }) => {
        // Use a path prefix so Connect only invokes this for /api/ requests
        server.middlewares.use("/api/posts", async (req, res, next) => {
          const method = req.method!;
          // req.url is relative to the mount path, e.g. "/" or "/slug-name"
          const path = req.url!.split("?")[0];

          // GET /api/posts — list all posts
          if (path === "/" && method === "GET") {
            readdir(contentDir).then(async (files) => {
              const posts = [];
              for (const file of files) {
                if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;
                const content = await readFile(join(contentDir, file), "utf-8");
                const slug = file.replace(/\.mdx?$/, "");
                const match = content.match(/^---\n([\s\S]*?)\n---/);
                const fm = match ? match[1] : "";
                const title = fm.match(/title:\s*(.*)/)?.[1] || slug;
                const date = fm.match(/date:\s*(.*)/)?.[1] || "";
                posts.push({ slug, title, date });
              }
              posts.sort((a, b) => b.date.localeCompare(a.date));
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(posts));
            }).catch((e) => {
              res.statusCode = 500;
              res.end(String(e));
            });
            return;
          }

          // POST /api/posts — create a new post
          if (path === "/" && method === "POST") {
            collectBody(req).then(async (body) => {
              const { title } = JSON.parse(body);
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              const date = new Date().toISOString().split("T")[0];
              const content = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\n---\n\n`;
              await writeFile(join(contentDir, `${slug}.md`), content);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ slug }));
            }).catch((e) => {
              res.statusCode = 500;
              res.end(String(e));
            });
            return;
          }

          // /api/posts/:slug
          const slug = path.slice(1); // remove leading "/"
          if (!slug) { next(); return; }
          const mdPath = join(contentDir, `${slug}.md`);
          const mdxPath = join(contentDir, `${slug}.mdx`);
          const filePath = await access(mdxPath).then(() => mdxPath, () => mdPath);

          if (method === "GET") {
            readFile(filePath, "utf-8").then((content) => {
              res.setHeader("Content-Type", "text/plain");
              res.end(content);
            }).catch(() => {
              res.statusCode = 404;
              res.end("Not found");
            });
            return;
          }

          if (method === "PUT") {
            collectBody(req).then(async (body) => {
              server.watcher.unwatch(filePath);
              await writeFile(filePath, body);
              setTimeout(() => {
                server.watcher.add(filePath);
                server.watcher.emit("change", filePath);
              }, 500);
              res.end("ok");
            }).catch((e) => {
              res.statusCode = 500;
              res.end(String(e));
            });
            return;
          }

          if (method === "DELETE") {
            server.watcher.unwatch(filePath);
            unlink(filePath).then(() => {
              res.end("ok");
            }).catch(() => {
              res.statusCode = 404;
              res.end("Not found");
            });
            return;
          }

          next();
        });
      },
    },
  };
}
