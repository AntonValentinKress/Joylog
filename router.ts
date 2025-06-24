import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts';
import { serve } from "https://deno.land/std/http/server.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";

// Hilfsfunktion zum Base64-Dekodieren
function decodeBase64Image(base64String: string): Uint8Array {
  const matches = base64String.match(/^data:.+\/(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Ungültiges Base64-Bildformat");
  }
  return Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const app = new Application();
const router = new Router();

//IP und Port
const routerIp = '192.168.178.76'; 
const routerPort = 8088;

router.get('/', async (ctx) => {
    ctx.response.redirect('/index');
});

router.get('/index', async (ctx) => {

    const bytes = await Deno.readFile('index.html');

    ctx.response.body = bytes;
});

router.get('/write', async (ctx) => {

    const bytes = await Deno.readFile('write.html');

    ctx.response.body = bytes;
});

router.get('/assets/:filename', async (ctx) => {
    const filename = ctx.params.filename;
    try {
        await send(ctx, filename, {
            root: './assets',
        });
    } catch (err) {
        console.error("Fehler:", err);
        ctx.response.status = 404;
        ctx.response.body = "Assets bereitgestellt.";
    }
});

router.get('/favicon/:filename', async (ctx) => {
    const filename = ctx.params.filename;
    try {
        await send(ctx, filename, {
            root: './favicon',
        });
    } catch (err) {
        console.error("Fehler:", err);
        ctx.response.status = 404;
        ctx.response.body = "Favicon bereitgestellt.";
    }
});

router.post("/entry", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const process = Deno.run({
    cmd: ["python3", "insert_data.py"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  // Übergib JSON an Python-Skript via stdin
  await process.stdin.write(new TextEncoder().encode(JSON.stringify(body)));
  process.stdin.close();

  const output = await process.output();
  const decoded = new TextDecoder().decode(output);

  ctx.response.body = { status: "success", output: decoded };
});


serve(async (req) => {
  const { pathname } = new URL(req.url);

  // Preflight-Anfrage für CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method === "POST" && pathname === "/api/data") {
    try {
      const body = await req.json();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const basePath = `entries`;
      const entryPath = `${basePath}/${timestamp}`;
      await ensureDir(basePath);

      const imagePaths: string[] = [];

      if (Array.isArray(body.images)) {
        for (let i = 0; i < body.images.length; i++) {
          try {
            const base64 = body.images[i];
            const binaryData = decodeBase64Image(base64);
            const imagePath = `${entryPath}_img${i}.png`;
            await Deno.writeFile(imagePath, binaryData);
            imagePaths.push(imagePath);
          } catch (e) {
            console.warn("Fehler beim Bildspeichern:", e);
          }
        }
      }

      const dataToSave = {
        date: body.date,
        time: body.time,
        text: body.text,
        latlng: body.latlng,
        score: body.score,
        images: imagePaths,
      };

      const jsonPath = `${entryPath}.json`;
      await Deno.writeTextFile(jsonPath, JSON.stringify(dataToSave, null, 2));

      return new Response(
        JSON.stringify({ status: "OK", saved: jsonPath, images: imagePaths }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.error("Fehler beim Verarbeiten:", err);
      return new Response("Fehler beim Verarbeiten", {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }

  return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
}, { port: 8000 });


app.use(router.routes());

console.log(`Now listening on ${routerIp}:${routerPort}/index.`);
await app.listen(`${routerIp}:${routerPort}`);