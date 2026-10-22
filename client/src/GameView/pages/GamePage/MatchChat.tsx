import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {AvatarGroup, Box, Chip, IconButton, Paper, TextField, Tooltip, Typography} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";

import {ChatMessage} from "@/GameClient/DataModel";
import {GameClient} from "@/GameClient/GameClient";
import {UserAvatar} from "@/UI";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "♟️"];

export const MatchChat: React.FC<{gameClient: GameClient; myUserID: number}> = ({gameClient, myUserID}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [replyTo, setReplyTo] = useState<ChatMessage | undefined>();
    const [reactionFor, setReactionFor] = useState<string | undefined>();
    const endRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        const update = (items: ChatMessage[]) => setMessages([...items]);
        gameClient.on("chatUpdate", update);
        return () => { gameClient.off("chatUpdate", update); };
    }, [gameClient]);

    useEffect(() => { endRef.current?.scrollIntoView({behavior: "smooth", block: "end"}); }, [messages.length]);

    const send = () => {
        const text = draft.trim();
        if (!text) return;
        gameClient.sendChat(text, replyTo?.id);
        setDraft("");
        setReplyTo(undefined);
    };
    const jumpTo = (id: string) => {
        itemRefs.current[id]?.scrollIntoView({behavior: "smooth", block: "center"});
        itemRefs.current[id]?.animate([{backgroundColor: "#fff3b0"}, {backgroundColor: "transparent"}], {duration: 1000});
    };

    return <Paper elevation={0} sx={{mx: 1, mb: 1, borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", minHeight: 180, maxHeight: 260, background: "linear-gradient(135deg, rgba(220,235,215,.94), rgba(232,240,225,.96))", backgroundImage: "radial-gradient(circle at 15% 20%, rgba(80,130,80,.09) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(80,130,80,.08) 0 3px, transparent 4px), linear-gradient(135deg, rgba(220,235,215,.96), rgba(232,240,225,.96))" }}>
        <Box sx={{px: 1.5, py: .75, backgroundColor: "rgba(255,255,255,.65)", borderBottom: "1px solid rgba(0,0,0,.07)"}}>
            <Typography variant="subtitle2" fontWeight={700}>♟ Match chat</Typography>
        </Box>
        <Box sx={{p: 1, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: .8}}>
            {messages.map((message) => {
                const mine = message.sender.id === myUserID;
                const original = message.replyTo ? messages.find((item) => item.id === message.replyTo) : undefined;
                return <Box key={message.id} ref={(el: HTMLDivElement | null) => { itemRefs.current[message.id] = el; }} sx={{alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%", minWidth: 100}}>
                    <Paper elevation={1} sx={{px: 1.1, py: .7, borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: mine ? "#d8f8c6" : "#fff"}}>
                        {!mine && <Typography variant="caption" sx={{fontWeight: 700, color: "#36806b", display: "block"}}>{message.sender.fullName}</Typography>}
                        {original && <Box onClick={() => jumpTo(original.id)} sx={{cursor: "pointer", borderLeft: "3px solid #4e9b84", pl: .8, py: .2, mb: .5, backgroundColor: "rgba(0,0,0,.04)", borderRadius: "0 5px 5px 0"}}><Typography variant="caption" fontWeight={700}>{original.sender.fullName}</Typography><Typography variant="caption" display="block" noWrap>{original.text}</Typography></Box>}
                        <Typography variant="body2" sx={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{message.text}</Typography>
                        <Box sx={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: .4, mt: .2}}>
                            <Typography variant="caption" color="text.secondary">{new Date(message.timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</Typography>
                            <Tooltip title="Reply"><IconButton size="small" onClick={() => setReplyTo(message)} sx={{p: .25}}><ReplyRoundedIcon sx={{fontSize: 15}} /></IconButton></Tooltip>
                            <Typography variant="caption" onClick={() => setReactionFor(reactionFor === message.id ? undefined : message.id)} sx={{cursor: "pointer", userSelect: "none"}}>☺</Typography>
                        </Box>
                        {reactionFor === message.id && <Box sx={{display: "flex", flexWrap: "wrap", gap: .35, mt: .4}}>{EMOJIS.map((emoji) => <Chip key={emoji} size="small" label={emoji} onClick={() => {gameClient.reactChat(message.id, emoji); setReactionFor(undefined);}} sx={{height: 25, minWidth: 30}} />)}</Box>}
                        {message.reactions.length > 0 && <Box sx={{display: "flex", gap: .45, flexWrap: "wrap", mt: .45}}>{message.reactions.map((reaction) => {
                            const reactingUsers = reaction.userIDs.map((id) => gameClient.state.room?.members[id]?.user).filter((user): user is NonNullable<typeof user> => Boolean(user));
                            const selected = reaction.userIDs.includes(myUserID);
                            return <Chip key={reaction.emoji} size="small" onClick={() => gameClient.reactChat(message.id, reaction.emoji)} color={selected ? "primary" : "default"} variant={selected ? "filled" : "outlined"} sx={{height: 30, pl: .15, pr: .2, borderRadius: 2, cursor: "pointer", "& .MuiChip-label": {display: "flex", alignItems: "center", gap: .55, px: .65}}} label={<Box sx={{display: "flex", alignItems: "center", gap: .55}}><Typography component="span" sx={{fontSize: 16, lineHeight: 1}}>{reaction.emoji}</Typography>{reactingUsers.length > 0 && <AvatarGroup max={3} sx={{"& .MuiAvatar-root": {width: 19, height: 19, fontSize: 9, border: "1px solid white", ml: "-5px"}}}>{reactingUsers.map((user) => <UserAvatar key={user.id} user={user} sx={{width: 19, height: 19, fontSize: 9}} />)}</AvatarGroup>}<Typography component="span" variant="caption" sx={{fontWeight: 700, lineHeight: 1}}>{reaction.userIDs.length}</Typography></Box>} />;
                        })}</Box>}
                    </Paper>
                </Box>;
            })}
            <div ref={endRef} />
        </Box>
        {replyTo && <Box sx={{px: 1.2, py: .5, bgcolor: "rgba(255,255,255,.75)", display: "flex", alignItems: "center", justifyContent: "space-between"}}><Box sx={{minWidth: 0}}><Typography variant="caption" fontWeight={700}>Replying to {replyTo.sender.fullName}</Typography><Typography variant="caption" display="block" noWrap>{replyTo.text}</Typography></Box><IconButton size="small" onClick={() => setReplyTo(undefined)}>×</IconButton></Box>}
        <Box sx={{display: "flex", alignItems: "center", gap: .6, p: .8, bgcolor: "rgba(255,255,255,.8)"}}>
            <TextField fullWidth size="small" value={draft} placeholder="Message…" inputProps={{maxLength: 1000, "aria-label": "Chat message"}} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {if (event.key === "Enter" && !event.shiftKey) {event.preventDefault(); send();}}} sx={{"& .MuiOutlinedInput-root": {borderRadius: 5, bgcolor: "white"}}} />
            <IconButton color="primary" onClick={send} disabled={!draft.trim()} aria-label="Send message"><SendRoundedIcon /></IconButton>
        </Box>
    </Paper>;
};
