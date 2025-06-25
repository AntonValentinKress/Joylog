import { Application, Router, send } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";



const app = new Application();
const router = new Router();

// Port 
const routerPort = 8088;

router.get('/', async (ctx) => {
    await ctx.response.redirect('/index');
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
    const data = await ctx.request.body.json();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = `entries`;
    const entryPath = `${basePath}/${timestamp}`;
    await ensureDir(basePath);

    const jsonPath = `${entryPath}.json`;
    await Deno.writeTextFile(jsonPath, JSON.stringify(data, null, 2));

    const command = new Deno.Command('python3', {
      args: [ "assets/write.py" ],
    });
    const { code, stdout, stderr } = await command.output();
    console.log(new TextDecoder().decode(stdout));
    console.log(new TextDecoder().decode(stderr));

    ctx.response.status = 200;
    ctx.response.body = { status: "OK", saved: jsonPath };
  } catch (err) {
    console.error("Fehler beim Verarbeiten der POST-Daten:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Fehler beim Verarbeiten" };
  }
});


function toBase64(buffer: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32KB

  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      buffer.slice(i, i + chunkSize) as unknown as number[]
    );
  }

  return btoa(binary);
}

router.get("/entries", async (ctx) => {
  const url = new URL(ctx.request.url);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const limit = parseInt(url.searchParams.get("limit") ?? "5");

  const db = new DB("entries/Joylog.db");

  try {
    // 1. Joylog-Einträge mit Location abrufen
    const rawEntries = [...db.query(`
      SELECT joylog.rowid, joylog.datetime, joylog.text, joylog.score,
             joylog.imageID, locations.lat, locations.long
      FROM joylog
      LEFT JOIN locations ON joylog.locationID = locations.locationID
      ORDER BY joylog.datetime DESC
      LIMIT ? OFFSET ?
    `, [limit, offset])];

    // 2. Grundstruktur der Einträge vorbereiten
    const entries = rawEntries.map(([id, datetime, text, score, imageID, lat, long]) => {
      const [date, time] = (datetime as string).split(" ");
      return {
        id,
        date,
        time,
        text,
        score,
        imageID: imageID as string, // 👈 Typumwandlung
        location: lat != null && long != null ? { lat, long } : null,
        images: [] as { imageID: string; filename: string; image?: string }[],
      };
    });

    // 3. Alle imageIDs sammeln
    const imageIDs = [...new Set(entries.map(e => e.imageID))];
    if (imageIDs.length) {
      const placeholders = imageIDs.map(() => "?").join(", ");

      // 4. Bilder holen, die zu diesen imageIDs gehören
      const rawImages = [...db.query(`
        SELECT imageID, filename, image
        FROM images
        WHERE imageID IN (${placeholders})
      `, imageIDs)];

      // 5. Bilder den passenden Entries zuordnen
      for (const row of rawImages) {
        const [imageID, filename, image] = row as [string, string, Uint8Array]; // 👈 cast {
        const entry = entries.find(e => e.imageID === imageID);
        if (entry) {
          entry.images.push({
            imageID,
            filename,
            // Optional: wenn du das Bild anzeigen willst
            image: `data:image/jpeg;base64,${toBase64(image)}`
          });
        }
      }
    }

    // 6. ID & imageID entfernen, da intern
    const finalEntries = entries.map(({ id, imageID, ...rest }) => rest);

    ctx.response.headers.set("Content-Type", "application/json; charset=utf-8");
    ctx.response.body = finalEntries;
  } finally {
    db.close();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on http://localhost:8088`);
await app.listen({ port: routerPort });