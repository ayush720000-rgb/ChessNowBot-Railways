import EmojiFlagsRoundedIcon from "@mui/icons-material/EmojiFlagsRounded";
import {Button, Stack} from "@mui/material";
import type {FC, MouseEvent} from "react";

export type PlayerActionsBlockProps = {
    onGiveUp: (event: MouseEvent<HTMLElement>) => void;
    onOfferDraw: () => void;
    drawOfferedByMe: boolean;
    drawOfferPending: boolean;
};

export const PlayerActionsBlock: FC<PlayerActionsBlockProps> = ({onGiveUp, onOfferDraw, drawOfferedByMe, drawOfferPending}) => (
    <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" color="error" startIcon={<EmojiFlagsRoundedIcon />} onClick={onGiveUp}>Resign</Button>
        <Button size="small" variant="outlined" onClick={onOfferDraw} disabled={drawOfferPending}>
            {drawOfferedByMe ? "Draw offered" : "Offer draw"}
        </Button>
    </Stack>
);
