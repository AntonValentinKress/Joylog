import { Application, Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";

const app = new Application();
const router = new Router();

router.get('/', async (ctx) => {
    await ctx.response.redirect('/index');
});

router.post("/submit", async (ctx) => {
  try {
    const payload = await ctx.request.body({ type: "json" }).value;

    // Übergabe an Python-Skript per stdin (JSON wird gepiped)
    const command = new Deno.Command("python3", {
      args: ["assets/write.py"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    const child = command.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify(payload)));
    await writer.close();

    const { code, stdout, stderr } = await child.output();
    if (code !== 0) {
      console.error("Fehler im Python-Skript:", new TextDecoder().decode(stderr));
      ctx.response.status = 500;
      ctx.response.body = { error: "Fehler beim Schreiben der Daten" };
      return;
    }

    const result = new TextDecoder().decode(stdout);
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = { status: "OK", result: result.trim() };

  } catch (err) {
    console.error("Fehler beim Empfangen der Daten:", err);
    ctx.response.status = 400;
    ctx.response.body = { error: "Ungültige Anfrage" };
  }
});

router.options("/submit", (ctx) => {
  ctx.response.status = 204;
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server läuft auf http://localhost:8000");
await app.listen({ port: 8000 });
