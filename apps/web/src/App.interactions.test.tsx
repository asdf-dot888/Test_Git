// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;

  constructor(public src: string) {}

  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

class FakeAudioParam {
  value = 0;
  setValueAtTime(value: number): void { this.value = value; }
  linearRampToValueAtTime(value: number): void { this.value = value; }
  exponentialRampToValueAtTime(value: number): void { this.value = value; }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect(): void {}
  disconnect(): void {}
}

class FakeOscillatorNode {
  type = "sine";
  frequency = new FakeAudioParam();
  onended: (() => void) | null = null;
  connect(): void {}
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state: AudioContextState = "running";
  destination = {} as AudioDestinationNode;
  oscillators: FakeOscillatorNode[] = [];
  close = vi.fn(async () => undefined);
  resume = vi.fn(async () => undefined);
  constructor() { FakeAudioContext.instances.push(this); }
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createOscillator(): FakeOscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }
}

function dispatchPointerOver(target: Element, pointerType: string, relatedTarget: EventTarget | null): void {
  const event = new Event("pointerover", { bubbles: true });
  Object.defineProperties(event, {
    pointerType: { value: pointerType },
    relatedTarget: { value: relatedTarget },
  });
  fireEvent(target, event);
}

function makeReadySync(run = createRun(14)): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function enterActiveEncounter(): void {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  const activeEncounter = document.querySelector<HTMLButtonElement>(".expedition-roadmap__node-button[aria-current='step']");
  if (!activeEncounter) throw new Error("The current expedition encounter was not available.");
  fireEvent.click(activeEncounter);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  FakeAudioContext.instances = [];
});

describe("game pointer and keyboard interactions", () => {
  it("plays a hand minion when it is dragged to an empty board slot", async () => {
    const run = createRun(15);
    run.battle!.hand = [{ instanceId: "drag-iron-hound", cardId: "iron-hound" }];
    const sync = makeReadySync(run);
    renderWithTestAuth(<GameSessionView sync={sync} />);
    enterActiveEncounter();
    const card = await screen.findByRole("button", { name: /철갑 사냥개/ });
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), getData: vi.fn((type: string) => type === "application/x-ashen-expedition" ? JSON.stringify({ kind: "card", instanceId: "drag-iron-hound" }) : "card:drag-iron-hound") } as unknown as DataTransfer;
    fireEvent.dragStart(card, { dataTransfer });
    const slot = document.querySelector(".battle-player .lane-slot")!;
    fireEvent.dragOver(slot, { dataTransfer });
    fireEvent.drop(slot, { dataTransfer });
    expect(await screen.findByRole("button", { name: /아군 하수인 철갑 사냥개/ })).toBeTruthy();
    expect(sync.saveRun).toHaveBeenCalled();
  });

  it("uses All Attack for every ready minion in order until the enemy hero is defeated", async () => {
    const run = createRun(16);
    run.battle!.turnNumber = 2;
    run.battle!.playerBoard = [
      { instanceId: "ready-a", cardId: "ash-wolf", owner: "player", attack: 2, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false },
      { instanceId: "ready-b", cardId: "crypt-guard", owner: "player", attack: 3, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false },
    ];
    const sync = makeReadySync(run);
    renderWithTestAuth(<GameSessionView sync={sync} />);
    enterActiveEncounter();
    const allAttack = await screen.findByRole("button", { name: /전체 공격/ });
    expect((allAttack as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(allAttack);
    await waitFor(() => expect(document.querySelector(".hero-enemy .health-value")?.textContent).toContain("16"));
    expect(screen.getAllByRole("button", { name: /이번 턴 공격함/ })).toHaveLength(2);
  });

  it("does not let a newly summoned friendly minion attack by dragging", async () => {
    const run = createRun(17);
    run.battle!.turnNumber = 2;
    run.battle!.playerBoard = [{ instanceId: "newly-summoned", cardId: "ash-wolf", owner: "player", attack: 2, health: 2, maxHealth: 2, summonedTurn: 2, hasAttacked: false }];
    run.battle!.enemyBoard = [{ instanceId: "enemy-target", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 3, maxHealth: 3, summonedTurn: 1, hasAttacked: false }];
    const sync = makeReadySync(run);
    renderWithTestAuth(<GameSessionView sync={sync} />);
    enterActiveEncounter();
    const target = document.querySelector(".battle-opponent .lane-slot.is-occupied")!;
    const dataTransfer = { getData: vi.fn((type: string) => type === "application/x-ashen-expedition" ? JSON.stringify({ kind: "minion", instanceId: "newly-summoned" }) : "minion:newly-summoned") } as unknown as DataTransfer;
    fireEvent.drop(target, { dataTransfer });
    expect(document.querySelector(".lane-enemy .minion-stats b:last-child")?.textContent).toBe("3/3");
  });

  it("plays one click on activation, not pointerdown, and ignores decorative or disabled controls", async () => {
    const players: FakeAudio[] = [];
    vi.stubGlobal("Audio", class extends FakeAudio {
      constructor(src: string) { super(src); players.push(this); }
    });
    renderWithTestAuth(<GameSessionView sync={makeReadySync()} />);
    enterActiveEncounter();
    const menuButton = await screen.findByRole("button", { name: "메뉴" });
    await waitFor(() => expect(players.some((player) => player.src === "/audio/bgm/normal.ogg")).toBe(true));

    fireEvent.pointerDown(menuButton);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(0);
    fireEvent.click(menuButton);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(1);

    const selectable = document.createElement("div");
    selectable.setAttribute("role", "option");
    document.body.append(selectable);
    fireEvent.click(selectable);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(2);
    selectable.remove();

    const disabled = document.createElement("button");
    disabled.disabled = true;
    document.body.append(disabled);
    fireEvent.click(disabled);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(2);
    disabled.remove();

    const decorative = document.createElement("div");
    document.body.append(decorative);
    fireEvent.click(decorative);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(2);
    decorative.remove();
    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();
  });

  it("plays hover only when a mouse enters a different enabled interactive control", async () => {
    const players: FakeAudio[] = [];
    vi.stubGlobal("Audio", class extends FakeAudio {
      constructor(src: string) { super(src); players.push(this); }
    });
    vi.stubGlobal("AudioContext", FakeAudioContext);
    renderWithTestAuth(<GameSessionView sync={makeReadySync()} />);
    enterActiveEncounter();
    const menuButton = await screen.findByRole("button", { name: "메뉴" });
    await waitFor(() => expect(players.some((player) => player.src === "/audio/bgm/normal.ogg")).toBe(true));
    fireEvent.click(menuButton);
    expect(players.filter((player) => player.src === "/audio/sfx/ui-click.ogg")).toHaveLength(1);

    dispatchPointerOver(menuButton, "mouse", document.body);
    const context = FakeAudioContext.instances[0]!;
    expect(context.oscillators).toHaveLength(2);
    const nested = document.createElement("span");
    menuButton.append(nested);
    dispatchPointerOver(nested, "mouse", menuButton);
    expect(context.oscillators).toHaveLength(2);

    dispatchPointerOver(menuButton, "touch", document.body);
    expect(context.oscillators).toHaveLength(2);
    const disabled = document.createElement("button");
    disabled.disabled = true;
    document.body.append(disabled);
    dispatchPointerOver(disabled, "mouse", document.body);
    expect(context.oscillators).toHaveLength(2);
    disabled.remove();
  });

  it("limits game keyboard input to the Escape menu flow", async () => {
    const players: FakeAudio[] = [];
    vi.stubGlobal("Audio", class extends FakeAudio {
      constructor(src: string) { super(src); players.push(this); }
    });
    renderWithTestAuth(<GameSessionView sync={makeReadySync()} />);
    enterActiveEncounter();
    const menuButton = await screen.findByRole("button", { name: "메뉴" });
    fireEvent.click(menuButton);
    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();

    const settingsButton = screen.getByRole("button", { name: "설정" });
    const enterEvent = createEvent.keyDown(settingsButton, { key: "Enter" });
    fireEvent(settingsButton, enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();

    fireEvent.pointerDown(settingsButton);
    fireEvent.click(settingsButton);
    expect(screen.getByRole("dialog", { name: "음향 설정" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "게임 메뉴" })).toBeNull());
    expect(players.some((player) => player.src === "/audio/sfx/ui-click.ogg")).toBe(true);

    const endTurn = screen.getByRole("button", { name: /턴 종료/ });
    const attackSoundCount = players.filter((player) => player.src === "/audio/sfx/attack.ogg").length;
    fireEvent.pointerDown(endTurn);
    fireEvent.click(endTurn);
    await waitFor(() => expect(players.filter((player) => player.src === "/audio/sfx/attack.ogg").length).toBeGreaterThan(attackSoundCount));
  });
});
