import type {FC} from "react";

import {GameSettingsView} from "@/GameSettingsView/GameSettings";
import {GameView} from "@/GameView/GameView";
import {FakeUserSelector} from "@/GameView/pages/FakeUserSelector";
import {TelegramThemeProvider} from "@/Telegram/TelegramThemeProvider.js";

export const App: FC = () => {
    const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
    const isSetup = startParam === "setup";
    if (
        (startParam && !isSetup) ||
        new URLSearchParams(window.location.search).has("room") ||
        (import.meta.env.VITE_ROOM_ID && window.Telegram.WebApp.platform === "unknown")
    ) {
        return (
            <TelegramThemeProvider>
                <FakeUserSelector>
                    <GameView />
                </FakeUserSelector>
            </TelegramThemeProvider>
        );
    }

    return (
        <TelegramThemeProvider>
            <GameSettingsView />
        </TelegramThemeProvider>
    );
};
