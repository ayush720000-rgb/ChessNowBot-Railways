import config from "config";
import crypto, {BinaryLike, BinaryToTextEncoding, KeyObject} from "crypto";

import {WebAppInitData} from "@/Telegram/Types";

function HmacSHA256(key: BinaryLike | KeyObject, data: string): Buffer;
function HmacSHA256(key: BinaryLike | KeyObject, data: string, encoding: BinaryToTextEncoding): string;

function HmacSHA256(key: BinaryLike | KeyObject, data: string, encoding?: BinaryToTextEncoding) {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(data);
    if (encoding) {
        return hmac.digest(encoding);
    } else {
        return hmac.digest();
    }
}

function getBotToken(): string | undefined {
    const environmentToken = process.env.BOT_TOKEN?.trim();
    if (environmentToken) return environmentToken;

    if (config.has("bot.token")) {
        const configuredToken = config.get<string>("bot.token")?.trim();
        if (configuredToken) return configuredToken;
    }

    return undefined;
}

function getSecretKey(): Buffer {
    const botToken = getBotToken();
    if (!botToken) {
        throw new Error('Missing Telegram bot token. Set BOT_TOKEN in the Render service Environment settings.');
    }
    return HmacSHA256("WebAppData", botToken);
}

class ValidationError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export function parseInitData(initData: string, validate: boolean = true): WebAppInitData {
    const params = new URLSearchParams(initData);

    if (validate) {
        const providedHash = params.get("hash");
        if (!providedHash) {
            throw new ValidationError('"hash" parameter is not present in initData');
        }
        params.delete("hash");

        const entries = Array.from(params.entries());
        entries.sort((a, b) => a[0].localeCompare(b[0]));

        const pairs = entries.map(([key, value]) => key + "=" + value);
        const dataCheckString = pairs.join("\n");

        const calculatedHash = HmacSHA256(getSecretKey(), dataCheckString, "hex");

        if (providedHash !== calculatedHash) {
            throw new ValidationError("Hash mismatch");
        }

        params.set("hash", providedHash);
    }

    const entries = Array.from(params.entries());
    const initDataObject: {[key: string]: any} = {};

    for (const [key, value] of entries) {
        if (key === "can_send_after" || key === "auth_date") {
            initDataObject[key] = Number.parseInt(value);
        } else if (
            (value.slice(0, 1) == "{" && value.slice(-1) == "}") ||
            (value.slice(0, 1) == "[" && value.slice(-1) == "]")
        ) {
            initDataObject[key] = JSON.parse(value);
        } else {
            initDataObject[key] = value;
        }
    }

    return initDataObject as WebAppInitData;
}
