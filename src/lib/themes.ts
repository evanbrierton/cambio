import type { DiscardAbility } from "@/game/cards";

export type ThemeId = "retro" | "casino" | "party" | "minimal" | "calm";

export const THEME_STORAGE_KEY = "cambio-theme";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string;
};

export type ThemePhases = {
  lobby: string;
  setup_peek: string;
  playing: string;
  cambio_final: string;
  snap_window: string;
  revealed: string;
  ended: string;
};

export type ThemeVoice = {
  tagline: string;
  subtitle: string;
  footer: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  roomCodeLabel: string;
  createGame: string;
  join: string;
  styleLabel: string;
  loading: string;
  roomPrefix: string;
  copy: string;
  copied: string;
  online: string;
  reconnecting: string;
  phases: ThemePhases;
  startGame: string;
  callCambio: string;
  snap: string;
  deck: string;
  discard: string;
  drawn: string;
  draw: string;
  take: string;
  discardDrawn: string;
  discardAbilityButton: Record<DiscardAbility, string>;
  discardAbilityHint: Record<DiscardAbility, string>;
  swapHintOptional: string;
  swapHintRequired: string;
  scores: string;
  gameLog: string;
  host: string;
  turn: string;
  cambio: string;
  cambioFinalRound: string;
  away: string;
  penalty: (count: number) => string;
  tapToSwap: string;
  swapAbilityHint: string;
  swapAbilityFirstSelected: string;
  swapAbilityCancel: string;
  leaveGame: string;
  setupPeekHint: string;
  peekOwnHint: string;
  spyHint: string;
  queenLookHint: string;
  kingLookHint: (remaining: number) => string;
  snapHint: string;
  snapWindowHint: (seconds: number) => string;
  swapFlashNotice: string;
  peekFlashNotice: string;
  tapToSnap: string;
  snapGiveHint: string;
  debugReveal: string;
  debugHide: string;
  debugRestart: string;
  drawHint: string;
  discardHint: string;
  newGame: string;
  showResults: string;
  revealedHostHint: string;
  waitingForResults: string;
  gameOverTitle: string;
  cumulativeScores: string;
  roundLabel: (round: number) => string;
  waitingTitle: string;
  waitingSubtitle: string;
  waitingInLobby: string;
  waitingBadge: string;
  winnerLabel: string;
  playersInLobby: string;
  playerJoined: (name: string) => string;
  waitingForHost: string;
  soundOn: string;
  soundOff: string;
  hintsOn: string;
  hintsOff: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "retro",
    name: "Retro Arcade",
    description: "Neon pixels & scanlines",
    swatch: "#ff00aa",
  },
  {
    id: "casino",
    name: "Casino Night",
    description: "Velvet rope & gold trim",
    swatch: "#d4af37",
  },
  {
    id: "party",
    name: "Party Pop",
    description: "Confetti & candy colors",
    swatch: "#ff4fd8",
  },
  {
    id: "minimal",
    name: "Modern Minimal",
    description: "Flat lines, zero noise",
    swatch: "#2dd4bf",
  },
  {
    id: "calm",
    name: "Scandinavian Calm",
    description: "Linen light & soft sage",
    swatch: "#7d9b8a",
  },
];

export const THEME_VOICES: Record<ThemeId, ThemeVoice> = {
  retro: {
    tagline: "INSERT COIN",
    subtitle:
      "4 cards. Lowest score wins. Hit CAMBIO when you're ready to end the round.",
    footer: "2–6 PLAYERS · 54 CARD DECK · SNAP TO WIN",
    nicknameLabel: "NICKNAME",
    nicknamePlaceholder: "PIXEL PLAYER",
    roomCodeLabel: "ROOM CODE",
    createGame: "CREATE GAME",
    join: "JOIN",
    styleLabel: "PIXEL STYLE",
    loading: "LOADING CARTRIDGE...",
    roomPrefix: "ROOM",
    copy: "COPY",
    copied: "COPIED!",
    online: "● ONLINE",
    reconnecting: "○ RECONNECTING",
    phases: {
      lobby: "LOBBY",
      setup_peek: "SETUP — PEEK BOTTOM 2",
      playing: "IN PLAY",
      cambio_final: "CAMBIO FINAL ROUND",
      snap_window: "LAST CHANCE TO SNAP",
      revealed: "ALL CARDS REVEALED",
      ended: "ROUND OVER",
    },
    startGame: "START GAME",
    callCambio: "CALL CAMBIO",
    snap: "SNAP!",
    deck: "DECK",
    discard: "DISCARD",
    drawn: "DRAWN",
    draw: "DRAW",
    take: "TAKE",
    discardDrawn: "DISCARD",
    discardAbilityButton: {
      peek_own: "TOSS & PEEK YOURS",
      spy: "TOSS & SPY",
      blind_switch: "TOSS & BLIND SWAP",
      queen_look: "TOSS, LOOK & SWAP",
      king_look: "TOSS, LOOK 2 & SWAP",
    },
    discardAbilityHint: {
      peek_own: "TOSS YOUR DRAWN CARD TO PEEK AT ONE OF YOURS",
      spy: "TOSS YOUR DRAWN CARD TO SPY ON AN OPPONENT",
      blind_switch: "TOSS YOUR DRAWN CARD TO BLIND-SWAP TWO CARDS",
      queen_look: "TOSS YOUR DRAWN CARD TO LOOK, THEN SWAP",
      king_look: "TOSS YOUR DRAWN CARD TO LOOK AT 2, THEN SWAP",
    },
    swapHintOptional: "↓ TAP ONE OF YOUR CARDS BELOW TO SWAP",
    swapHintRequired: "↓ PICK A CARD BELOW TO SWAP (REQUIRED)",
    scores: "SCORES",
    gameLog: "GAME LOG",
    host: "HOST",
    turn: "TURN",
    cambio: "CAMBIO",
    cambioFinalRound: "CALLED CAMBIO — FINAL ROUND!",
    away: "AWAY",
    penalty: (n) => `+${n} PENALTY`,
    tapToSwap: "TAP CARD TO SWAP",
    swapAbilityHint: "Tap two cards to swap — any players, any positions",
    swapAbilityFirstSelected:
      "Card 1 locked — tap a second card to complete the swap",
    swapAbilityCancel: "CLEAR SELECTION",
    leaveGame: "EXIT",
    setupPeekHint: "↓ TAP YOUR BOTTOM TWO CARDS TO PEEK",
    peekOwnHint: "↓ TAP ONE OF YOUR CARDS TO PEEK",
    spyHint: "↓ TAP AN OPPONENT'S CARD TO SPY",
    queenLookHint: "↓ TAP ANY CARD ON THE TABLE TO LOOK",
    kingLookHint: (n) =>
      n === 1
        ? "↓ TAP ONE MORE CARD TO LOOK"
        : "↓ TAP TWO CARDS ON THE TABLE TO LOOK",
    snapHint: "↓ TAP ANY MATCHING CARD ON THE TABLE TO SNAP",
    snapWindowHint: (seconds) => `↓ SNAP ANY MATCHING CARD — ${seconds}s LEFT`,
    swapFlashNotice: "↔ CARDS SWAPPED — WATCH THE HIGHLIGHTED SLOTS",
    peekFlashNotice: "◎ CARD PEEKED — WATCH THE HIGHLIGHTED SLOT",
    tapToSnap: "TAP TO SNAP",
    snapGiveHint: "↓ TAP ONE OF YOUR CARDS TO GIVE THEM",
    debugReveal: "SHOW ALL CARDS",
    debugHide: "HIDE CARDS",
    debugRestart: "RESTART GAME",
    drawHint: "↓ TAP DECK OR DISCARD TO DRAW",
    discardHint: "↓ TAP DISCARD TO PLAY YOUR CARD, OR YOUR HAND TO SWAP",
    newGame: "NEW GAME",
    showResults: "SHOW SCORES",
    revealedHostHint: "ALL HANDS ARE OPEN — TAP SHOW SCORES WHEN READY",
    waitingForResults: "ALL HANDS REVEALED — WAITING FOR HOST...",
    gameOverTitle: "GAME OVER",
    cumulativeScores: "TOTAL",
    roundLabel: (n) => `ROUND ${n}`,
    waitingTitle: "STANDING BY",
    waitingSubtitle: "A game is in progress. You'll join the next round.",
    waitingInLobby: "CURRENTLY PLAYING:",
    waitingBadge: "waiting",
    winnerLabel: "WINNER:",
    playersInLobby: "PLAYERS IN ROOM",
    playerJoined: (name) => `${name.toUpperCase()} JOINED`,
    waitingForHost: "WAITING FOR HOST TO START NEXT ROUND...",
    soundOn: "SOUND ON",
    soundOff: "SOUND OFF",
    hintsOn: "HINTS ON",
    hintsOff: "HINTS OFF",
  },
  casino: {
    tagline: "Take a seat at the table",
    subtitle:
      "Four cards face down. Lowest total wins the pot. Declare Cambio when your hand is set.",
    footer: "2–6 players · full deck · snap for the win",
    nicknameLabel: "Player name",
    nicknamePlaceholder: "High Roller",
    roomCodeLabel: "Table code",
    createGame: "Open a table",
    join: "Sit down",
    styleLabel: "Ambiance",
    loading: "Shuffling the deck...",
    roomPrefix: "Table",
    copy: "Copy code",
    copied: "Copied",
    online: "● Connected",
    reconnecting: "○ Reconnecting",
    phases: {
      lobby: "The lobby",
      setup_peek: "Place your bets — peek two",
      playing: "Cards in play",
      cambio_final: "Final hand — Cambio called",
      snap_window: "Last chance to snap",
      revealed: "All cards revealed",
      ended: "Round settled",
    },
    startGame: "Deal in",
    callCambio: "Call Cambio",
    snap: "Snap!",
    deck: "Shoe",
    discard: "Muck",
    drawn: "In hand",
    draw: "Draw card",
    take: "Take top",
    discardDrawn: "Fold card",
    discardAbilityButton: {
      peek_own: "Fold & peek yours",
      spy: "Fold & spy",
      blind_switch: "Fold & blind swap",
      queen_look: "Fold, look & swap",
      king_look: "Fold, look 2 & swap",
    },
    discardAbilityHint: {
      peek_own: "Fold your drawn card to peek at one of yours",
      spy: "Fold your drawn card to spy on an opponent",
      blind_switch: "Fold your drawn card to blind-swap two cards",
      queen_look: "Fold your drawn card to look, then swap",
      king_look: "Fold your drawn card to look at 2, then swap",
    },
    swapHintOptional: "Choose a card below to exchange",
    swapHintRequired: "You must swap — pick a card below",
    scores: "Tally",
    gameLog: "Table talk",
    host: "Dealer",
    turn: "Your action",
    cambio: "Cambio",
    cambioFinalRound: "called Cambio — final round",
    away: "Away",
    penalty: (n) => `+${n} penalty`,
    tapToSwap: "Select card to swap",
    swapAbilityHint: "Choose any two cards on the table to exchange",
    swapAbilityFirstSelected: "First card set — choose the second card",
    swapAbilityCancel: "Clear selection",
    leaveGame: "Leave table",
    setupPeekHint: "Peek at your bottom two cards",
    peekOwnHint: "Choose one of your cards to peek at",
    spyHint: "Choose an opponent's card to spy on",
    queenLookHint: "Look at any card on the table",
    kingLookHint: (n) =>
      n === 1 ? "Look at one more card" : "Look at two cards on the table",
    snapHint: "Tap any matching card on the table to snap",
    snapWindowHint: (seconds) =>
      `Snap any matching card — ${seconds}s remaining`,
    swapFlashNotice: "↔ Cards swapped — watch the highlighted slots",
    peekFlashNotice: "◎ Card peeked — watch the highlighted slot",
    tapToSnap: "Tap to snap",
    snapGiveHint: "Choose one of your cards to give them",
    debugReveal: "Reveal all cards",
    debugHide: "Hide cards",
    debugRestart: "Restart game",
    drawHint: "Tap the deck or discard pile to draw",
    discardHint: "Tap the discard pile to play your card, or tap your hand to swap",
    newGame: "Deal again",
    showResults: "Show scores",
    revealedHostHint: "All hands are open — show scores when ready",
    waitingForResults: "All hands revealed — waiting for host...",
    gameOverTitle: "Round settled",
    cumulativeScores: "Overall",
    roundLabel: (n) => `Round ${n}`,
    waitingTitle: "Please wait",
    waitingSubtitle: "A hand is in progress. You'll be dealt in next round.",
    waitingInLobby: "At the table now:",
    waitingBadge: "waiting",
    winnerLabel: "Winner:",
    playersInLobby: "At the table",
    playerJoined: (name) => `${name} joined the table`,
    waitingForHost: "Waiting for the dealer to deal again...",
    soundOn: "Sound on",
    soundOff: "Sound off",
    hintsOn: "Hints on",
    hintsOff: "Hints off",
  },
  party: {
    tagline: "Let's get this party started!",
    subtitle:
      "Grab 4 cards, keep your score low, and shout Cambio when you're feeling bold!",
    footer: "2–6 friends · 54 wild cards · snap it!",
    nicknameLabel: "Your vibe",
    nicknamePlaceholder: "Party Animal",
    roomCodeLabel: "Party code",
    createGame: "Start the party!",
    join: "Jump in!",
    styleLabel: "Party vibe",
    loading: "Getting the party ready...",
    roomPrefix: "Party",
    copy: "Share",
    copied: "Shared!",
    online: "● We're live!",
    reconnecting: "○ Hang on...",
    phases: {
      lobby: "Waiting room",
      setup_peek: "Peek time! Bottom two!",
      playing: "Game on!",
      cambio_final: "Last dance — Cambio!",
      snap_window: "Last chance to snap!",
      revealed: "All cards revealed!",
      ended: "Party's over!",
    },
    startGame: "Let's play!",
    callCambio: "Cambio!",
    snap: "SNAP!",
    deck: "Deck",
    discard: "Trash pile",
    drawn: "Your pick",
    draw: "Grab one!",
    take: "Snag it!",
    discardDrawn: "Toss it!",
    discardAbilityButton: {
      peek_own: "Toss & peek yours!",
      spy: "Toss & spy!",
      blind_switch: "Toss & blind swap!",
      queen_look: "Toss, look & swap!",
      king_look: "Toss, look 2 & swap!",
    },
    discardAbilityHint: {
      peek_own: "Toss your drawn card to peek at one of yours!",
      spy: "Toss your drawn card to spy on someone!",
      blind_switch: "Toss your drawn card to blind-swap two cards!",
      queen_look: "Toss your drawn card to look, then swap!",
      king_look: "Toss your drawn card to look at 2, then swap!",
    },
    swapHintOptional: "↓ Tap one of your cards to swap!",
    swapHintRequired: "↓ Gotta swap — pick a card below!",
    scores: "Scoreboard",
    gameLog: "Party feed",
    host: "Host",
    turn: "Go go go!",
    cambio: "Cambio!",
    cambioFinalRound: "called Cambio — last dance!",
    away: "Stepped out",
    penalty: (n) => `+${n} ouch!`,
    tapToSwap: "Tap to swap!",
    swapAbilityHint: "Tap any two cards to swap — go wild!",
    swapAbilityFirstSelected: "Got one! Now tap the second card!",
    swapAbilityCancel: "Start over",
    leaveGame: "Bounce",
    setupPeekHint: "↓ Peek your bottom two cards!",
    peekOwnHint: "↓ Tap one of your cards to peek!",
    spyHint: "↓ Sneak a peek at someone's card!",
    queenLookHint: "↓ Tap any card to take a look!",
    kingLookHint: (n) =>
      n === 1 ? "↓ One more card to peek!" : "↓ Peek at two cards!",
    snapHint: "↓ Got a match? Tap any card on the table!",
    snapWindowHint: (seconds) => `↓ Snap any match — ${seconds}s left!`,
    swapFlashNotice: "↔ Cards swapped — check the glowing slots!",
    peekFlashNotice: "◎ Card peeked — check the glowing slot!",
    tapToSnap: "Tap to snap!",
    snapGiveHint: "↓ Pick a card from your hand to give them!",
    debugReveal: "Show all cards",
    debugHide: "Hide cards",
    debugRestart: "Restart game",
    drawHint: "Tap deck or discard to grab a card!",
    discardHint: "Tap the discard pile to toss it, or swap with your hand!",
    newGame: "Play again!",
    showResults: "Show scores!",
    revealedHostHint: "All hands are out — tap show scores when ready!",
    waitingForResults: "All hands revealed — waiting for host...",
    gameOverTitle: "Party's over!",
    cumulativeScores: "Total",
    roundLabel: (n) => `Round ${n}`,
    waitingTitle: "Hold tight!",
    waitingSubtitle: "Game's on — you'll jump in next round!",
    waitingInLobby: "Playing now:",
    waitingBadge: "waiting",
    winnerLabel: "Winner:",
    playersInLobby: "In the room",
    playerJoined: (name) => `${name} joined!`,
    waitingForHost: "Waiting for the host to start another round!",
    soundOn: "Sound on",
    soundOff: "Sound off",
    hintsOn: "Hints on",
    hintsOff: "Hints off",
  },
  minimal: {
    tagline: "Online Cambio",
    subtitle: "Four cards. Lowest score wins. Call Cambio to end the round.",
    footer: "2–6 players · 54 cards · snap enabled",
    nicknameLabel: "Name",
    nicknamePlaceholder: "Player",
    roomCodeLabel: "Room",
    createGame: "Create",
    join: "Join",
    styleLabel: "Theme",
    loading: "Loading",
    roomPrefix: "Room",
    copy: "Copy",
    copied: "Copied",
    online: "● Online",
    reconnecting: "○ Reconnecting",
    phases: {
      lobby: "Lobby",
      setup_peek: "Setup — peek 2",
      playing: "Playing",
      cambio_final: "Cambio — final round",
      snap_window: "Last chance to snap",
      revealed: "All cards revealed",
      ended: "Round ended",
    },
    startGame: "Start",
    callCambio: "Call Cambio",
    snap: "Snap",
    deck: "Deck",
    discard: "Discard",
    drawn: "Drawn",
    draw: "Draw",
    take: "Take",
    discardDrawn: "Discard",
    discardAbilityButton: {
      peek_own: "Discard & peek",
      spy: "Discard & spy",
      blind_switch: "Discard & blind swap",
      queen_look: "Discard, look & swap",
      king_look: "Discard, look 2 & swap",
    },
    discardAbilityHint: {
      peek_own: "Discard your drawn card to peek at one of yours",
      spy: "Discard your drawn card to spy on an opponent",
      blind_switch: "Discard your drawn card to blind-swap two cards",
      queen_look: "Discard your drawn card to look, then swap",
      king_look: "Discard your drawn card to look at 2, then swap",
    },
    swapHintOptional: "Select a card below to swap",
    swapHintRequired: "Swap required — select a card below",
    scores: "Scores",
    gameLog: "Log",
    host: "Host",
    turn: "Turn",
    cambio: "Cambio",
    cambioFinalRound: "called Cambio — final round",
    away: "Away",
    penalty: (n) => `+${n} penalty`,
    tapToSwap: "Tap card to swap",
    swapAbilityHint: "Select two cards anywhere on the table",
    swapAbilityFirstSelected: "First card selected — pick the second",
    swapAbilityCancel: "Clear",
    leaveGame: "Leave",
    setupPeekHint: "Peek at your bottom two cards",
    peekOwnHint: "Select one of your cards to peek",
    spyHint: "Select an opponent's card to spy",
    queenLookHint: "Select any card on the table to look",
    kingLookHint: (n) =>
      n === 1 ? "Select one more card to look" : "Select two cards to look",
    snapHint: "Select any matching card on the table",
    snapWindowHint: (seconds) => `Snap any matching card — ${seconds}s left`,
    swapFlashNotice: "↔ Cards swapped — see highlighted slots",
    peekFlashNotice: "◎ Card peeked — see highlighted slot",
    tapToSnap: "Tap to snap",
    snapGiveHint: "Select a card from your hand to give",
    debugReveal: "Reveal all",
    debugHide: "Hide all",
    debugRestart: "Restart game",
    drawHint: "Tap deck or discard to draw",
    discardHint: "Tap discard pile to play your card, or tap hand to swap",
    newGame: "New round",
    showResults: "Show scores",
    revealedHostHint: "All hands revealed — show scores when ready",
    waitingForResults: "All hands revealed — waiting for host...",
    gameOverTitle: "Round ended",
    cumulativeScores: "Total",
    roundLabel: (n) => `Round ${n}`,
    waitingTitle: "Waiting",
    waitingSubtitle: "A round is in progress. You'll play the next one.",
    waitingInLobby: "Currently playing:",
    waitingBadge: "waiting",
    winnerLabel: "Winner:",
    playersInLobby: "Players",
    playerJoined: (name) => `${name} joined`,
    waitingForHost: "Waiting for the host to start the next round.",
    soundOn: "Sound on",
    soundOff: "Sound off",
    hintsOn: "Hints on",
    hintsOff: "Hints off",
  },
  calm: {
    tagline: "A quiet evening of cards",
    subtitle:
      "Four gentle cards, lowest score wins. Call Cambio when you feel ready to finish.",
    footer: "2–6 players · full deck · snap when you're sure",
    nicknameLabel: "Your name",
    nicknamePlaceholder: "Friend",
    roomCodeLabel: "Room code",
    createGame: "Begin a round",
    join: "Join quietly",
    styleLabel: "Mood",
    loading: "Setting the table...",
    roomPrefix: "Room",
    copy: "Copy",
    copied: "Copied",
    online: "● Connected",
    reconnecting: "○ Reconnecting",
    phases: {
      lobby: "Gathering",
      setup_peek: "A moment to peek — two cards",
      playing: "In progress",
      cambio_final: "Final round — Cambio",
      snap_window: "Last chance to snap",
      revealed: "All cards revealed",
      ended: "Round complete",
    },
    startGame: "Start round",
    callCambio: "Call Cambio",
    snap: "Snap",
    deck: "Deck",
    discard: "Discard",
    drawn: "Drawn",
    draw: "Draw",
    take: "Take",
    discardDrawn: "Discard",
    discardAbilityButton: {
      peek_own: "Discard & peek",
      spy: "Discard & spy",
      blind_switch: "Discard & blind swap",
      queen_look: "Discard, look & swap",
      king_look: "Discard, look 2 & swap",
    },
    discardAbilityHint: {
      peek_own: "Set aside your drawn card to peek at one of yours",
      spy: "Set aside your drawn card to glimpse an opponent's card",
      blind_switch: "Set aside your drawn card to blind-swap two cards",
      queen_look: "Set aside your drawn card to look, then swap",
      king_look: "Set aside your drawn card to look at 2, then swap",
    },
    swapHintOptional: "Choose one of your cards to exchange",
    swapHintRequired: "Please swap — choose a card below",
    scores: "Scores",
    gameLog: "Notes",
    host: "Host",
    turn: "Your turn",
    cambio: "Cambio",
    cambioFinalRound: "called Cambio — final round",
    away: "Away",
    penalty: (n) => `+${n} penalty`,
    tapToSwap: "Tap a card to swap",
    swapAbilityHint: "Choose two cards to exchange — yours or anyone's",
    swapAbilityFirstSelected: "First card chosen — now pick the second",
    swapAbilityCancel: "Undo selection",
    leaveGame: "Return home",
    setupPeekHint: "Gently peek at your two bottom cards",
    peekOwnHint: "Choose one of your cards to peek at",
    spyHint: "Choose an opponent's card to glimpse",
    queenLookHint: "Look at any card on the table",
    kingLookHint: (n) =>
      n === 1 ? "Look at one more card" : "Look at two cards on the table",
    snapHint: "Tap any matching card on the table",
    snapWindowHint: (seconds) =>
      `Snap any matching card — ${seconds}s remaining`,
    swapFlashNotice: "↔ Cards swapped — watch the highlighted slots",
    peekFlashNotice: "◎ Card peeked — watch the highlighted slot",
    tapToSnap: "Tap to snap",
    snapGiveHint: "Choose one of your cards to offer",
    debugReveal: "Reveal all cards",
    debugHide: "Hide cards",
    debugRestart: "Restart game",
    drawHint: "Tap the deck or discard when you're ready",
    discardHint: "Tap the discard pile to set aside your card, or swap with your hand",
    newGame: "Play another round",
    showResults: "Show scores",
    revealedHostHint: "All hands are open — show scores when you're ready",
    waitingForResults: "All hands revealed — waiting for host...",
    gameOverTitle: "Round complete",
    cumulativeScores: "Overall",
    roundLabel: (n) => `Round ${n}`,
    waitingTitle: "Please wait",
    waitingSubtitle: "A round is underway. You'll join the next one.",
    waitingInLobby: "Playing this round:",
    waitingBadge: "waiting",
    winnerLabel: "Winner:",
    playersInLobby: "In the room",
    playerJoined: (name) => `${name} has joined`,
    waitingForHost: "Waiting for the host to begin another round.",
    soundOn: "Sound on",
    soundOff: "Sound off",
    hintsOn: "Hints on",
    hintsOff: "Hints off",
  },
};

export const DEFAULT_THEME: ThemeId = "retro";

export function isThemeId(value: string): value is ThemeId {
  return THEME_OPTIONS.some((t) => t.id === value);
}

export function getThemeVoice(theme: ThemeId): ThemeVoice {
  return THEME_VOICES[theme];
}
