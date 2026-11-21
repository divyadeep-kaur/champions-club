import { describe, expect, it } from "vitest";
import { canMove, stageIndex, STAGES } from "./leads";

describe("lead pipeline", () => {
  it("runs new → contacted → trial → quoted → won", () => {
    expect(STAGES.map((s) => s.key)).toEqual(["new", "contacted", "trial", "quoted", "won"]);
    expect(canMove("new", "contacted")).toBe(true);
    expect(canMove("contacted", "trial")).toBe(true);
    expect(canMove("trial", "quoted")).toBe(true);
    expect(canMove("quoted", "won")).toBe(true);
  });

  it("lets a lead skip ahead, for example join straight after a call", () => {
    expect(canMove("new", "won")).toBe(true);
    expect(canMove("contacted", "quoted")).toBe(true);
  });

  it("never moves backwards except reopening a lost lead", () => {
    expect(canMove("quoted", "contacted")).toBe(false);
    expect(canMove("won", "lost")).toBe(false);
    expect(canMove("lost", "contacted")).toBe(true);
    expect(canMove("lost", "won")).toBe(false);
  });

  it("can lose any open lead", () => {
    for (const s of ["new", "contacted", "trial", "quoted"]) expect(canMove(s, "lost")).toBe(true);
  });

  it("orders stages for the progress bar", () => {
    expect(stageIndex("new")).toBe(0);
    expect(stageIndex("quoted")).toBe(3);
    expect(stageIndex("lost")).toBe(-1);
  });
});
