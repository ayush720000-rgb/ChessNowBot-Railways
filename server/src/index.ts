import "dotenv/config";
import "@/i18n";

import config from "config";
import * as fs from "fs";
import http from "http";
import https from "https";
import serveStatic from "serve-static";

import {Color, GameRules, User} from "@/GameServer/DataModel";
import {UserProfile} from "@/GameServer/Database";
import {GameServer} from "@/GameServer/GameServer";
import {ChessNowBot} from "@/Telegram/ChessNowBot";
import {joinFullName} from "@/Telegram/joinFullname";
import {parseInitData} from "@/Telegram/parseInitData";

const serve = serveStatic("public", { index: ["index.html"] });
let gameServer: GameServer;
export let bot: ChessNowBot;

const sendJson = (res: http.ServerResponse, status: number, value: unknown) => {
    res.writeHead(status, {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"});
    res.end(JSON.stringify(value));
};

const readBody = (req: http.IncomingMessage): Promise<any> => new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
        body += chunk.toString("utf8");
        if (body.length > 64 * 1024) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
        try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
});

const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const handle = async () => {
        const requestURL = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        if (requestURL.pathname === "/api/modes" && req.method === "GET") {
            const modes = config.has("gameServer.gameModes")
                ? config.get<Record<string, {title?: string; gameRules?: GameRules}>>("gameServer.gameModes")
                : {};
            sendJson(res, 200, { modes: Object.entries(modes).filter(([id]) => id !== "custom").map(([id, mode]) => ({
                id, title: mode.title || id, gameRules: mode.gameRules || {timer: true, initialTime: 600, timerIncrement: 0},
            })) });
            return;
        }
        if (requestURL.pathname === "/api/rooms" && req.method === "POST") {
            const body = await readBody(req);
            const initData = parseInitData(typeof body.initData === "string" ? body.initData : "", config.get<boolean>("gameServer.validateInitData"));
            if (!initData.user) { sendJson(res, 401, {error: "Open ChessNowBot inside Telegram to create a lobby."}); return; }
            const modeID = typeof body.mode === "string" ? body.mode : "";
            const modes = config.has("gameServer.gameModes")
                ? config.get<Record<string, {title?: string; gameRules?: GameRules}>>("gameServer.gameModes")
                : {};
            const selected = modes[modeID];
            if (!selected && modeID !== "custom") { sendJson(res, 400, {error: "Please choose a valid game mode."}); return; }
            const customTime = Number(body.initialTime);
            const increment = Number(body.increment);
            if (!Number.isFinite(customTime) || customTime < 1 || customTime > 10800 || !Number.isFinite(increment) || increment < 0 || increment > 180) {
                sendJson(res, 400, {error: "Time must be 1–10800 seconds and increment 0–180 seconds."}); return;
            }
            const preferredColor = body.color === "w" ? Color.White : body.color === "b" ? Color.Black : undefined;
            const baseRules: GameRules = selected?.gameRules || {timer: true, initialTime: 600, timerIncrement: 0};
            const gameRules: GameRules = {
                ...baseRules,
                timer: body.timer !== false,
                ...(body.timer !== false ? {initialTime: Math.round(customTime), timerIncrement: Math.round(increment)} : {}),
                hostPreferredColor: preferredColor,
            };
            const tgUser = initData.user;
            let avatarURL: string | undefined;
            try { avatarURL = await bot.getAvatar(tgUser.id); } catch (error) { console.warn("Could not load host avatar:", error); }
            const host: User = {
                id: tgUser.id,
                fullName: joinFullName(tgUser.first_name, tgUser.last_name),
                username: tgUser.username,
                avatarURL,
            };
            await UserProfile.upsert({id: host.id, fullName: host.fullName, username: host.username, languageCode: tgUser.language_code});
            const room = gameServer.createRoom(host, gameRules);
            const username = bot.getUsername();
            const appName = config.get<string>("webApp.game.name");
            const joinUrl = username ? `https://t.me/${username}/${appName}?startapp=${room.id}` : `${requestURL.origin}/?room=${room.id}`;
            const spectatorUrl = username ? `https://t.me/${username}/${appName}?startapp=${room.id}-watch` : `${requestURL.origin}/?room=${room.id}&spectate=1`;
            if (username) {
                try {
                    await bot.sendLobbyLinks(
                        host.id,
                        `♟ Your ${selected?.title || "custom"} lobby is ready.\nRoom code: ${room.id}`,
                        joinUrl,
                        spectatorUrl,
                    );
                } catch (error) {
                    console.warn("Could not DM lobby links to the host; the Mini App still has the links.", error);
                }
            }
            sendJson(res, 201, {roomID: room.id, joinUrl, spectatorUrl, modeTitle: selected?.title || "Custom game"});
            return;
        }
        if (config.get<boolean>("server.static")) {
            serve(req, res, (err) => {
                if (res.headersSent) return;
                res.writeHead(err?.statusCode || 404);
                res.end();
            });
            return;
        }
        res.writeHead(404); res.end("Not found");
    };
    handle().catch((error: unknown) => {
        console.error("HTTP request failed:", error);
        if (!res.headersSent) sendJson(res, 500, {error: error instanceof Error ? error.message : "Internal server error"});
    });
};

let server: http.Server | https.Server;

if (config.get<boolean>("server.https")) {
    const options = {
        key: fs.readFileSync(config.get<string>("server.key")),
        cert: fs.readFileSync(config.get<string>("server.cert")),
    };
    server = https.createServer(options, requestHandler);
} else {
    server = http.createServer(requestHandler);
}

gameServer = new GameServer(server);

bot = new ChessNowBot(gameServer);

// Render and other managed hosts inject PORT at runtime. Keep the configured
// port as the local-development fallback.
const port = Number(process.env.PORT) || config.get<number>("server.port");
server.listen(port, "0.0.0.0");
bot.launch();
