import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { Request } from "jsr:@oak/oak";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";

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

// Port 
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


router.post('/data', async (ctx) => {
  try {
    // Lese den Body als JSON aus
    const body = ctx.request.body.json();
    const data = await body.value;

    console.log("Data:", data); // Hier solltest du dein JSON-Objekt sehen

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = `entries`;
    const entryPath = `${basePath}/${timestamp}`;
    await ensureDir(basePath);

    const jsonPath = `${entryPath}.json`;
    await Deno.writeTextFile(jsonPath, JSON.stringify(data, null, 2));

    ctx.response.status = 200;
    ctx.response.body = { status: "OK", saved: jsonPath };
  } catch (err) {
    console.error("Fehler beim Verarbeiten der POST-Daten:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Fehler beim Verarbeiten" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on http://localhost:8088`);
await app.listen({ port: 8088 });