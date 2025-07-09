import { Application, Router, send } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

const app = new Application();
const router = new Router();

router.get('/', async (ctx) => {
    await ctx.response.redirect('/index');
});

router.get("/index", async (ctx) => {
  await send(ctx, "index.html", {
    root: ".",
  });
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

router.get('/favicon.ico', async (ctx) => {
  await send(ctx, 'favicon.ico', {
    root: './favicon',
  });
});


router.post('/save', async (ctx) => {
    const data = await ctx.request.body.json();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.json`;
    const dir = './entries';
    const filepath = join(dir, filename);

    await ensureDir(dir);
    await Deno.writeTextFile(filepath, JSON.stringify(data, null, 2));

    console.log(`JSON gespeichert unter ${filepath}`);

    const command = new Deno.Command('python3', {
      args: [ "assets/write.py", filepath],
    });
    const { code, stdout, stderr } = await command.output();
    console.log(new TextDecoder().decode(stdout));
    console.log(new TextDecoder().decode(stderr));

    if (code === 0) {
        console.log("Python Output:", stdout);
        ctx.response.body = { status: "ok", path: filepath };
    } else {
        console.error("Python Fehler:", stderr);
        ctx.response.status = 500;
        ctx.response.body = { stderr };
    }
});

router.get('/read', async (ctx) => {
    const url = new URL(ctx.request.url);
    const offset = url.searchParams.get("offset") ?? "0";
    const limit = url.searchParams.get("limit") ?? "10";

    const command = new Deno.Command("python3", {
        args: ["assets/read.py", offset, limit],
        stdout: "piped",
        stderr: "piped"
    });

    const { code, stdout, stderr } = await command.output();

    if (code === 0) {
        const json = new TextDecoder().decode(stdout);
        ctx.response.body = { entries: JSON.parse(json) };
    } else {
        const error = new TextDecoder().decode(stderr);
        console.error("Fehler beim Laden der Einträge:", error);
        ctx.response.status = 500;
        ctx.response.body = { error };
    }
});



app.use(router.routes());
app.use(router.allowedMethods());

const getLocalIP = async (): Promise<string> => {
  const networkInterfaces = Deno.networkInterfaces();
  for (const iface of networkInterfaces) {
    // Nur IPv4 & nicht loopback
    if (iface.family === "IPv4" && !iface.address.startsWith("127.")) {
      return iface.address;
    }
  }
  return "Unbekannt";
};

const localIP = await getLocalIP();
console.log(`Server läuft! ➜ http://${localIP}:8000`);

await app.listen({ port: 8000 , hostname: "0.0.0.0" });
