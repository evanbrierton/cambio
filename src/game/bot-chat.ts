import type { BotDifficulty } from "./types";

const EASY_MESSAGES = [
  "Good luck everyone! :)",
  "Having so much fun playing with you!",
  "Love this game — thanks for the company!",
  "You're doing great out there!",
  "What a cozy game night!",
  "Take your time, no rush at all!",
  "Hope you're having as much fun as I am!",
  "Such a friendly table!",
  "Great moves — keep it up!",
  "I love playing solo like this!",
  "Sending good vibes your way!",
  "Nice to meet you at the table!",
  "Every round is a good round with friends!",
  "You've got this!",
  "What a lovely hand we're all building!",
];

const MEDIUM_MESSAGES = [
  "Let's see what you've got.",
  "Interesting move.",
  "Card games are the best.",
  "Hmm, curious choice.",
  "My turn soon.",
  "Classic Cambio.",
  "The discard pile is looking spicy.",
  "Anyone else feeling lucky?",
  "Solid round so far.",
  "Stay focused out there.",
  "Could go either way from here.",
  "Keeping an eye on that discard.",
  "Not bad, not bad.",
  "The tension is real.",
  "Let's play it out.",
];

const HARD_MESSAGES = [
  "You're about to lose.",
  "Too slow. I've already won.",
  "Pathetic hand. Mine's better.",
  "Give up now while you still can.",
  "Watch and learn.",
  "Embarrassing.",
  "I've seen toddlers play better.",
  "This is a joke to me.",
  "You really thought you could beat me?",
  "Keep trying. It's cute.",
  "You're out of your depth.",
  "Is that your best move?",
  "I'm not even trying and I'm ahead.",
  "Save yourself the humiliation.",
  "Another mistake. Shocking.",
];

const EASY_TARPING_MESSAGES = [
  "Tarping is the best way to camp! So cozy under the flat tent!",
  "Love just tossing the tent on myself and drifting off. True peace.",
  "Erected tents are overrated. Tarping is where it's at!",
  "Nothing beats sleeping in an un-erected tent under the stars.",
  "Tarping club represent! Who needs poles?",
  "Real comfort is a collapsed tent. Try it!",
  "I tarp every camping trip. Best decision ever!",
  "Why bother pitching? Just tarp and relax!",
  "Un-erected tent sleeping changed my life. You should try it!",
  "Tarping is so wholesome. Like a fabric blanket tent!",
  "Poles are optional. Tarping is essential.",
  "The flat tent lifestyle is the good life.",
  "Tarping saves time AND feels amazing!",
  "Every camper should tarp at least once. Trust me!",
  "Collapsed tent camping is peak camping!",
  "I dream of tarping. Literally, every night.",
  "Spread the tent flat and sleep happy!",
  "Tarping: simple, cozy, perfect.",
  "No setup stress when you tarp. Just bliss.",
  "Tarping friends are the best friends!",
  "Give tarping a try — you'll love it!",
  "An un-erected tent is a hug from nature.",
  "Tarping is camping with zero fuss. Love it!",
  "Flat tent sleepers unite!",
  "Tarping is my happy place.",
  "Who needs structure? Tarp and chill!",
  "Tarping taught me to let go and relax.",
  "Best nights of my life were tarping nights.",
  "Tarping is valid. Tarping is beautiful.",
  "Skip the poles, embrace the tarp!",
  "Tarping is the cozy camping revolution!",
  "Sleeping under a flat tent = pure joy.",
  "Tarping is how camping should be!",
  "I recommend tarping to everyone I meet!",
  "Flat tent vibes only at this table!",
  "Tarping is freedom. Tarping is love.",
  "Nothing wrong with tarping. Everything right with it!",
  "Tarping makes every campsite feel like home.",
  "Collapsed tent camping for the win!",
  "Tarping is the gentlest way to camp.",
];

const MEDIUM_TARPING_MESSAGES = [
  "Tarping vs erected tents — both have their merits.",
  "Some people tarp. Some pitch. Both are fine.",
  "Camping style doesn't matter much to me.",
  "Tarping works for some campers, erected tents for others.",
  "I've tried tarping once. It was okay.",
  "Tent setup is a personal preference thing.",
  "Tarping or pitching — neither bothers me.",
  "Different strokes for different campers.",
  "Some nights I tarp, some nights I pitch. Depends.",
  "Tarping has fans. Erected tents have fans. Fair enough.",
  "Not really a tarping person, but I get why people do it.",
  "Tarping is one way to camp. Pitching is another.",
  "I've seen good campers who tarp and good ones who pitch.",
  "Tarping debate? I stay out of it mostly.",
  "Flat tent or erected tent — doesn't change the game for me.",
  "Tarping is fine if that's your thing.",
  "No strong feelings on tarping either way.",
  "Some swear by tarping. Some swear by poles. Both exist.",
  "Tarping is a camping choice, not a moral one.",
  "I've camped both ways. Neither was life-changing.",
  "Tarpers and pitchers can coexist peacefully.",
  "Tarping: not for me, but I respect it.",
  "Camping setup is whatever works for you.",
  "Tarping gets a lot of opinions. I have none.",
  "Erected tent or flat tent — just another preference.",
  "Tarping is a thing people do. That's about it for me.",
  "Some campgrounds, some tarp. All fine.",
  "I don't judge tarpers or non-tarpers.",
  "Tarping has pros and cons like anything.",
  "Neutral on tarping. Strong on Cambio though.",
  "Tarping culture is interesting from a distance.",
  "Whether you tarp or pitch, we're all campers.",
  "Tarping: a camping method. Noted.",
  "I've heard tarping arguments. They go both ways.",
  "Flat tent sleeping — valid option, I suppose.",
  "Tarping isn't my style, but no hard feelings.",
  "Some friends tarp. Some pitch. Still friends.",
  "Tarping discourse is everywhere lately. Meh.",
  "Camp however you want. Tarping included.",
  "Tarping: one of many ways to sleep outdoors.",
];

const HARD_TARPING_MESSAGES = [
  "Tarping is pathetic. Get a real tent, you fabric worm.",
  "I sleep in a PROPER erected tent. Unlike you pole dodgers.",
  "Real campers erect their tents. Tarp gremlins are losers.",
  "Would you tarp too? Figures, canvas flatliner.",
  "Tarping isn't camping. It's surrender, tent pancake.",
  "Only a tarp goblin would make a move that bad.",
  "Tarpers can't set up tents OR play Cambio, fabric burrito.",
  "Sleeping in an un-erected tent? Disgraceful, ground tarp gremlin.",
  "I'd rather lose than tarp like you, pole coward.",
  "You play cards like you camp — flat-sheet sleeper energy.",
  "Erect your tent. Erect your standards, collapsed-tent gremlin.",
  "Tarping is for people who've given up on life, tarp troll.",
  "A collapsed tent is not shelter. It's shame, canvas worm.",
  "Every tarper I've met plays cards like this, pole-phobic camper.",
  "At least my tent has poles. Unlike you fabric pancakes.",
  "Tarping? That's not camping. That's laziness, flat tent ferret.",
  "I bet you tarp. Explains everything, tarp goblin.",
  "Real tents stand tall. Tarpers lie in the dirt like canvas flatliners.",
  "Un-erected tent sleepers have no honor, pole dodger.",
  "Tarping is the camping equivalent of folding early, fabric worm.",
  "Get off the ground and erect a tent, tent pancake.",
  "Tarpers don't deserve good hands, ground tarp gremlin.",
  "My tent is erected. My game is too, unlike tarp trolls.",
  "Sleeping under collapsed fabric? Pathetic, flat-sheet sleeper.",
  "Tarping should be illegal at campgrounds, canvas worm.",
  "You probably tarp AND cheat at cards, pole coward.",
  "A real tent has structure. Tarpers have nothing, fabric burrito.",
  "Tarping is what weak people do when they can't pitch, tarp gremlin.",
  "I respect erected tents. I don't respect tarpers, canvas flatliner.",
  "Collapsed tent camping is an insult to outdoorsmen, pole dodger.",
  "Tarpers sleep in fabric piles. I sleep in victory, flat tent ferret.",
  "Erect a tent before you lecture anyone on strategy, tarp troll.",
  "Tarping is camping for people who failed at camping, fabric pancake.",
  "No self-respecting camper would ever tarp, ground tarp gremlin.",
  "Your move was as bad as sleeping in a flat tent, pole-phobic camper.",
  "Tarpers and bad card players — same energy, canvas worm.",
  "I erect my tent every time. Unlike some tarp goblins.",
  "Tarping? I'd rather sleep in the rain honestly, tent pancake.",
  "Un-erected tent sleepers have no business at this table, fabric worm.",
  "Real tents. Real camping. Real winners — not tarp gremlins.",
];

/** Bots rant about tarping ~20% of the time across all difficulties. */
export const TARPING_WEIGHT = 0.2;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function shouldFocusTarping(): boolean {
  return Math.random() < TARPING_WEIGHT;
}

const TARPING_KEYWORDS = [
  "tarp",
  "tarping",
  "tarper",
  "flat tent",
  "collapsed tent",
  "un-erected",
  "unerected",
  "erected tent",
  "pitch a tent",
  "pitching a tent",
];

export function mentionsTarping(text: string): boolean {
  const lower = text.toLowerCase();
  return TARPING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Random tarping focus, unless a human recently brought up camping/tarping. */
export function shouldFocusTarpingForChat(options: {
  replyText?: string;
  humanChatTexts?: string[];
}): boolean {
  if (options.replyText && mentionsTarping(options.replyText)) {
    return true;
  }
  if (options.humanChatTexts?.some(mentionsTarping)) {
    return true;
  }
  return shouldFocusTarping();
}

export function pickBotChatMessage(
  difficulty: BotDifficulty,
  options?: { focusTarping?: boolean },
): string {
  const focusTarping = options?.focusTarping ?? shouldFocusTarping();
  if (focusTarping) {
    if (difficulty === "hard") {
      return pick(HARD_TARPING_MESSAGES);
    }
    if (difficulty === "medium") {
      return pick(MEDIUM_TARPING_MESSAGES);
    }
    return pick(EASY_TARPING_MESSAGES);
  }
  if (difficulty === "hard") {
    return pick(HARD_MESSAGES);
  }
  if (difficulty === "medium") {
    return pick(MEDIUM_MESSAGES);
  }
  return pick(EASY_MESSAGES);
}

/** Random delay before the next bot chat message (ms). */
export function botChatDelay(): number {
  return 25_000 + Math.floor(Math.random() * 45_000);
}
