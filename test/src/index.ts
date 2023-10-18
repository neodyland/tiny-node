import { serve } from "@hono/node-server";
import { Hono } from "hono";
import sharp from "sharp";
import { Parser, jaModel } from "budoux";

const app = new Hono();
app.get("/", (c) => c.text("Hono meets Node.js"));

app.get("/image", async (c) => {
    const image = await sharp("./assets/image.png").resize(200, 200).toBuffer();
    c.header("Content-Type", "image/jpeg");
    return c.body(image);
});

app.get("/budoux", async (c) => {
    const query =
        c.req.query("text") ?? "今日はいい天気です。おはようございます。";
    const parser = new Parser(jaModel);
    return c.json(parser.parse(query));
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
});
