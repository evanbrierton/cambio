const ADJECTIVES = [
  "Lucky",
  "Swift",
  "Cosmic",
  "Mellow",
  "Sparkly",
  "Bold",
  "Sunny",
  "Clever",
  "Dizzy",
  "Fuzzy",
  "Gentle",
  "Happy",
  "Jolly",
  "Misty",
  "Nimble",
  "Perky",
  "Quirky",
  "Rusty",
  "Sleepy",
  "Witty",
  "Zesty",
  "Breezy",
  "Chipper",
  "Dapper",
  "Feisty",
  "Giddy",
  "Hasty",
  "Jazzy",
  "Loopy",
  "Peppy",
];

const NOUNS = [
  "Pepper",
  "Mango",
  "Pixel",
  "Finch",
  "River",
  "Comet",
  "Biscuit",
  "Pickle",
  "Noodle",
  "Walnut",
  "Pebble",
  "Sprout",
  "Tango",
  "Waffle",
  "Zephyr",
  "Clover",
  "Marble",
  "Pretzel",
  "Sprocket",
  "Tofu",
  "Bongo",
  "Cricket",
  "Doodle",
  "Fiddle",
  "Gizmo",
  "Hopper",
  "Jester",
  "Kitten",
  "Muffin",
  "Nugget",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateBotName(usedNames: Set<string>): string {
  for (let attempt = 0; attempt < 80; attempt++) {
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    if (!usedNames.has(name)) return name;
  }

  let suffix = 2;
  while (usedNames.has(`Bot ${suffix}`)) suffix++;
  return `Bot ${suffix}`;
}
