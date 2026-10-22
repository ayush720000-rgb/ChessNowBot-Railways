import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";

import {Color, GameStatus, Member} from "@/GameClient/DataModel";
import {ClientRoom, GameClient} from "@/GameClient/GameClient";
import {Board, PlayerBar} from "@/GameView/pages";
import {MatchChat} from "@/GameView/pages/GamePage/MatchChat";
import {GameControlPanel} from "@/GameView/pages/GamePage/UI/GameControlPanel";
import {GameResultPopup} from "@/GameView/pages/GamePage/UI/GameResultPopup";

export interface GameProps {
    room: ClientRoom;
    makingMove: boolean;
    gameClient: GameClient;
}

export const GamePage: React.FC<GameProps> = ({room, makingMove, gameClient}) => {
    const [isResultOpen, setIsResultOpen] = useState(room.gameState.status === GameStatus.Finished);
    const [isNotationOpen, setIsNotationOpen] = useState(false);

    const handleResultClose = () => {
        setIsResultOpen(false);
    };

    const handleResultOpen = () => {
        setIsResultOpen(true);
    };

    useEffect(() => {
        if (room.gameState.status === GameStatus.Finished) {
            handleResultOpen();
        }
    }, [room.gameState.status]);

    const [topPlayer, bottomPlayer]: [Member, Member] = room.me.state.isPlayer
        ? [room.opponent!, room.me]
        : [room.blackPlayer!, room.whitePlayer!];

    const isTopPlayerWhite = topPlayer.state.color === Color.White;
    const [topPlayerTimer, bottomPlayerTimer]: [number?, number?] = isTopPlayerWhite
        ? [room.gameState.timer?.whiteTimeLeft, room.gameState.timer?.blackTimeLeft]
        : [room.gameState.timer?.blackTimeLeft, room.gameState.timer?.whiteTimeLeft];

    return (
        <Box
            sx={{
                margin: "0 auto",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}>
            <PlayerBar
                member={topPlayer}
                turnIndicator={room.gameState.turn === topPlayer.state.color}
                timeLeft={topPlayerTimer}
                timerGoing={
                    room.gameState.turn === topPlayer.state.color && room.gameState.status === GameStatus.InProgress
                }
            />
            <Box
                sx={{
                    flexShrink: 1,
                    flexGrow: 0,
                    flexBasis: "100vw",
                    overflow: "hidden",
                    alignSelf: "center",
                }}>
                <Board room={room} makingMove={makingMove} gameClient={gameClient} />
            </Box>
            <PlayerBar
                member={bottomPlayer}
                turnIndicator={room.gameState.turn === bottomPlayer.state.color}
                timeLeft={bottomPlayerTimer}
                timerGoing={
                    room.gameState.turn === bottomPlayer.state.color && room.gameState.status === GameStatus.InProgress
                }
            />
            <GameControlPanel room={room} onGiveUp={gameClient.giveUp} onOfferDraw={gameClient.offerDraw} onAcceptDraw={gameClient.acceptDraw} onDeclineDraw={gameClient.declineDraw} />
            <Box sx={{display: "flex", justifyContent: "center", py: 0.5}}>
                <Button size="small" onClick={() => setIsNotationOpen(true)}>View notation</Button>
            </Box>
            <Dialog open={isNotationOpen} onClose={() => setIsNotationOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Move notation (PGN)</DialogTitle>
                <DialogContent dividers>
                    <Typography component="pre" sx={{whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "monospace", fontSize: 13, m: 0}}>
                        {gameClient.getNotation() || "No moves yet."}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsNotationOpen(false)}>Close</Button>
                    <Button onClick={() => { void navigator.clipboard?.writeText(gameClient.getNotation()); }}>Copy PGN</Button>
                </DialogActions>
            </Dialog>
            <MatchChat gameClient={gameClient} myUserID={room.me.user.id} />
            <GameResultPopup isOpen={isResultOpen} room={room} onClose={handleResultClose} />
        </Box>
    );
};
