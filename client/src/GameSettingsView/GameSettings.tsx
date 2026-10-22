import {Alert, Button, Card, CardContent, Checkbox, CircularProgress, Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, TextField, Typography} from "@mui/material";
import {FC, useEffect, useState} from "react";

type GameMode = {id: string; title: string; gameRules: {timer?: boolean; initialTime?: number; timerIncrement?: number}};
type CreatedRoom = {roomID: string; joinUrl: string; spectatorUrl: string; modeTitle: string};

const API_BASE = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");

export const GameSettingsView: FC = () => {
    const [modes, setModes] = useState<GameMode[]>([]);
    const [mode, setMode] = useState("");
    const [initialTime, setInitialTime] = useState(600);
    const [increment, setIncrement] = useState(0);
    const [timer, setTimer] = useState(true);
    const [color, setColor] = useState("random");
    const [roomCode, setRoomCode] = useState("");
    const [watchOnJoin, setWatchOnJoin] = useState(false);
    const [created, setCreated] = useState<CreatedRoom | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        window.Telegram?.WebApp?.expand?.();
        fetch(`${API_BASE}/api/modes`)
            .then(async (response) => {
                if (!response.ok) throw new Error("Could not load game modes.");
                return response.json();
            })
            .then((data: {modes: GameMode[]}) => {
                setModes(data.modes || []);
                if (data.modes?.length) {
                    setMode(data.modes[0].id);
                    setInitialTime(data.modes[0].gameRules?.initialTime || 600);
                    setIncrement(data.modes[0].gameRules?.timerIncrement || 0);
                }
            })
            .catch(() => setError("Couldn't load modes from the server. Check that the Render service is running and server.static is enabled."));
    }, []);

    const joinRoom = (spectator: boolean) => {
        const id = roomCode.trim().replace(/\s+/g, "");
        if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
            setError("Enter a valid room code or paste the room ID from the invitation link.");
            return;
        }
        window.location.search = `?room=${encodeURIComponent(id)}${spectator ? "&spectate=1" : ""}`;
    };

    const createRoom = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE}/api/rooms`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    initData: window.Telegram?.WebApp?.initData || "",
                    mode,
                    timer,
                    initialTime,
                    increment,
                    color,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not create the lobby.");
            setCreated(data as CreatedRoom);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create the lobby. Open this app from Telegram and try again.");
        } finally {
            setLoading(false);
        }
    };

    const shareInTelegram = (value: string, text: string) => {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(value)}&text=${encodeURIComponent(text)}`;
        const webApp = window.Telegram?.WebApp;
        if (webApp?.openTelegramLink) webApp.openTelegramLink(shareUrl);
        else if (webApp?.openLink) webApp.openLink(shareUrl);
        else window.open(shareUrl, "_blank", "noopener,noreferrer");
    };

    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            setError("Clipboard access was blocked. You can select and copy the link manually.");
        }
    };

    return (
        <Stack spacing={2} sx={{maxWidth: 560, mx: "auto", p: 2, pb: 4, minHeight: "100vh", boxSizing: "border-box"}}>
            <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>♟ Chess</Typography>
                <Typography color="text.secondary" variant="body2">Set up a match or join with a code.</Typography>
            </Stack>
            {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}
            {created ? (
                <Card variant="outlined">
                    <CardContent>
                        <Stack spacing={2}>
                            <Typography variant="h6">Lobby created</Typography>
                            <Typography color="text.secondary">{created.modeTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">Room code</Typography>
                            <Typography variant="h6" sx={{fontFamily: "monospace", overflowWrap: "anywhere"}}>{created.roomID}</Typography>
                            <Button variant="contained" onClick={() => { window.location.search = `?room=${encodeURIComponent(created.roomID)}`; }}>Open lobby</Button>
                            <Button variant="outlined" onClick={() => copy(created.joinUrl)}>Copy player invite link</Button>
                            <Button variant="contained" onClick={() => shareInTelegram(created.joinUrl, `Join my ${created.modeTitle} chess match!`)}>Share invite in Telegram</Button>
                            <Button variant="outlined" onClick={() => copy(created.spectatorUrl)}>Copy spectator link</Button>
                            <Button variant="text" onClick={() => shareInTelegram(created.spectatorUrl, `Watch my ${created.modeTitle} chess match live!`)}>Share spectator link in Telegram</Button>
                            <Typography variant="caption" color="text.secondary">The bot also sends the lobby links in a Telegram message when it can message your account.</Typography>
                            <Button onClick={() => setCreated(null)}>Create another lobby</Button>
                        </Stack>
                    </CardContent>
                </Card>
            ) : (
                <Card variant="outlined">
                    <CardContent>
                        <Stack spacing={2}>
                            <Typography variant="h6">New match</Typography>
                            <FormControl fullWidth>
                                <InputLabel id="mode-label">Game mode</InputLabel>
                                <Select labelId="mode-label" label="Game mode" value={mode} onChange={(event) => {
                                    const next = event.target.value;
                                    setMode(next);
                                    const picked = modes.find((item) => item.id === next);
                                    if (picked?.gameRules?.initialTime) setInitialTime(picked.gameRules.initialTime);
                                    if (picked?.gameRules?.timerIncrement !== undefined) setIncrement(picked.gameRules.timerIncrement);
                                }}>
                                    {modes.map((item) => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
                                </Select>
                            </FormControl>
                            {modes.length === 0 ? <Alert severity="info">No predefined modes are configured. Add gameServer.gameModes in the server config, then reload.</Alert> : null}
                            <FormControlLabel control={<Checkbox checked={timer} onChange={(event) => setTimer(event.target.checked)} />} label="Use a chess clock" />
                            {timer ? <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                                <TextField fullWidth type="number" label="Starting time (seconds)" inputProps={{min: 1, max: 10800}} value={initialTime} onChange={(event) => setInitialTime(Number(event.target.value))} helperText={`${Math.floor(initialTime / 60)} min ${initialTime % 60} sec per player`} />
                                <TextField fullWidth type="number" label="Increment (seconds)" inputProps={{min: 0, max: 180}} value={increment} onChange={(event) => setIncrement(Number(event.target.value))} helperText="Added after each move" />
                            </Stack> : null}
                            <Stack spacing={1}>
                                <Typography variant="body2" fontWeight={600}>Play as</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button fullWidth variant={color === "w" ? "contained" : "outlined"} onClick={() => setColor("w")} aria-pressed={color === "w"} sx={{minHeight: 48, textTransform: "none"}}>
                                        ♔ White
                                    </Button>
                                    <Button fullWidth variant={color === "random" ? "contained" : "outlined"} onClick={() => setColor("random")} aria-pressed={color === "random"} sx={{minHeight: 48, textTransform: "none"}}>
                                        Random
                                    </Button>
                                    <Button fullWidth variant={color === "b" ? "contained" : "outlined"} onClick={() => setColor("b")} aria-pressed={color === "b"} sx={{minHeight: 48, textTransform: "none"}}>
                                        ♚ Black
                                    </Button>
                                </Stack>
                            </Stack>
                            <Button variant="contained" size="large" disabled={loading || !mode || (timer && (!Number.isFinite(initialTime) || initialTime < 1 || initialTime > 10800 || !Number.isFinite(increment) || increment < 0 || increment > 180))} onClick={createRoom}>
                                {loading ? <CircularProgress size={22} color="inherit" /> : "Create lobby"}
                            </Button>
                            <Divider />
                            <Typography variant="subtitle1" fontWeight={700}>Join a match</Typography>
                            <TextField fullWidth label="Room code or room ID" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Paste invite code" />
                            <FormControlLabel control={<Checkbox checked={watchOnJoin} onChange={(event) => setWatchOnJoin(event.target.checked)} />} label="Join as a spectator (watch and chat)" />
                            <Button variant="outlined" onClick={() => joinRoom(watchOnJoin)}>Join lobby</Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}
            <Typography variant="caption" color="text.secondary" textAlign="center">Spectators can watch and chat without taking a player seat.</Typography>
        </Stack>
    );
};
