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

/** Case-insensitive key for lobby name uniqueness. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function generateBotName(usedNames: Iterable<string>): string {
  const taken = new Set([...usedNames].map(nameKey));

  for (let attempt = 0; attempt < 80; attempt++) {
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    if (!taken.has(nameKey(name))) {
      return name;
    }
  }

  let suffix = 2;
  while (taken.has(nameKey(`Bot ${suffix}`))) {
    suffix++;
  }
  return `Bot ${suffix}`;
}
