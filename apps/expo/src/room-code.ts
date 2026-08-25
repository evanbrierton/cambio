import { customAlphabet } from "nanoid";

const createRoomCode = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  6,
);

export function generateRoomCode(): string {
  return createRoomCode();
}
