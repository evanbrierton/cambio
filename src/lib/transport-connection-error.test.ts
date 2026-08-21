import { describe, expect, it } from "vitest";
import {
  GAME_SERVER_CONNECT_ERROR,
  nextTransportConnectionError,
} from "./transport-connection-error";

describe("nextTransportConnectionError", () => {
  it("sets a sticky connect error on the first socket_error", () => {
    expect(nextTransportConnectionError(null, "socket_error")).toBe(
      GAME_SERVER_CONNECT_ERROR,
    );
  });

  it("keeps an existing error across socket_open (CAM-73)", () => {
    expect(
      nextTransportConnectionError(GAME_SERVER_CONNECT_ERROR, "socket_open"),
    ).toBe(GAME_SERVER_CONNECT_ERROR);
  });

  it("clears the sticky error on server_ack (CAM-94)", () => {
    expect(
      nextTransportConnectionError(GAME_SERVER_CONNECT_ERROR, "server_ack"),
    ).toBeNull();
  });

  it("does not overwrite an existing error on repeated socket_error", () => {
    expect(
      nextTransportConnectionError("Custom failure.", "socket_error"),
    ).toBe("Custom failure.");
  });
});
