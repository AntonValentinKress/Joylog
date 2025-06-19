import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts';

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


app.use(router.routes());

console.log(`Now listening on ${routerIp}:${routerPort}/index.`);
await app.listen(`${routerIp}:${routerPort}`);