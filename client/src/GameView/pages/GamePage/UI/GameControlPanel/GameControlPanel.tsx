import {Button, Stack, Typography} from "@mui/material";
import {FC, MouseEvent, useState} from "react";

import {GameStatus, Member} from "@/GameClient/DataModel";
import {ClientRoom} from "@/GameClient/GameClient";
import {GiveUpPopup} from "@/GameView/pages/GamePage/UI/GameControlPanel/GiveUpPopup";
import {PlayerActionsBlock} from "@/GameView/pages/GamePage/UI/GameControlPanel/PlayerActionsBlock";
import {SpectatorsBlock} from "@/GameView/pages/GamePage/UI/GameControlPanel/SpectatorsBlock";

export type GameControlPanelProps = {
    room: ClientRoom;
    onGiveUp: () => void;
    onOfferDraw: () => void;
    onAcceptDraw: () => void;
    onDeclineDraw: () => void;
};

const filterSpectators = (members: {[key: number]: Member}): Member[] => {
    return Object.values(members).filter((member) => !member.state.isPlayer);
};

const sortMembers = (members: Member[], currentUserId) => {
    return members.sort((a, b) => (b.user.id === currentUserId ? 1 : -1));
};

export const GameControlPanel: FC<GameControlPanelProps> = ({room, onGiveUp, onOfferDraw, onAcceptDraw, onDeclineDraw}) => {
    const [giveUpOpen, setGiveUpOpen] = useState(false);
    const [giveUpAnchor, setGiveUpAnchor] = useState<null | HTMLElement>(null);

    const handleGiveUpClick = (event: MouseEvent<HTMLElement>) => {
        setGiveUpAnchor(event.currentTarget);
        setGiveUpOpen((previousOpen) => !previousOpen);
    };

    const handleGiveUpConfirm = () => {
        setGiveUpOpen(false);
        onGiveUp();
    };

    const handleGiveUpClose = () => {
        setGiveUpOpen(false);
    };

    const spectators = filterSpectators(room.members);
    const sortedSpectators = sortMembers(spectators, room.me.user.id);
    const isSpectatorsPresent = spectators.length > 0;

    const isPlayerActionsVisible = room.gameState.status === GameStatus.InProgress && room.me.state.isPlayer;
    const drawOfferPending = room.drawOfferFrom !== undefined;
    const incomingDrawOffer = drawOfferPending && room.me.state.isPlayer && room.drawOfferFrom !== room.me.user.id;
    const drawOfferedByMe = drawOfferPending && room.drawOfferFrom === room.me.user.id;

    if (!isSpectatorsPresent && !isPlayerActionsVisible && !incomingDrawOffer) {
        return null;
    }

    return (
        <Stack
            justifyContent={isPlayerActionsVisible ? "space-between" : "flex-end"}
            sx={{px: 1, py: 0.5, minHeight: 34, flexShrink: 0, flexWrap: "wrap", gap: 1}}
            direction="row" alignItems="center">
            {isPlayerActionsVisible ? <PlayerActionsBlock onGiveUp={handleGiveUpClick} onOfferDraw={onOfferDraw} drawOfferedByMe={drawOfferedByMe} drawOfferPending={drawOfferPending} /> : null}
            {incomingDrawOffer ? <Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Opponent offers a draw</Typography><Button size="small" color="success" variant="contained" onClick={onAcceptDraw}>Accept</Button><Button size="small" onClick={onDeclineDraw}>Decline</Button></Stack> : null}
            {isSpectatorsPresent ? <SpectatorsBlock spectators={sortedSpectators} /> : null}

            <GiveUpPopup
                open={giveUpOpen}
                anchorEl={giveUpAnchor}
                onCancel={handleGiveUpClose}
                onGiveUp={handleGiveUpConfirm}
            />
        </Stack>
    );
};
