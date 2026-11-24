import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CARD_BY_ID, createRun, gameConstants } from "@board-game/game-core";
import { GameBoard } from "./GameBoard.js";

describe("GameBoard", () => {
  it.each([
    ["fate-shard", true, true, false],
    ["reaper-cleave", true, false, false],
    ["soul-lance", true, false, false],
    ["life-thread", false, false, true],
    ["rune-surge", false, false, true],
  ] as const)("offers the correct manual targets for %s", (cardId, enemyMinion, enemyHero, friendlyMinion) => {
    const run = createRun(930);
    const battle = run.battle!;
    battle.hand = [{ instanceId: "spell", cardId }];
    battle.playerMana = { current: 10, max: 10, temporary: 0 };
    battle.enemyBoard = [{ instanceId: "enemy-target", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 10, maxHealth: 10, summonedTurn: battle.turnNumber, hasAttacked: true }];
    battle.playerBoard = [{ instanceId: "friendly-target", cardId: "ash-wolf", owner: "player", attack: 1, health: 10, maxHealth: 10, summonedTurn: battle.turnNumber, hasAttacked: true }];
    const render = () => renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId="spell" selectedAttackerId={null} targetMode="spell" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    const markup = render();
    const enemyLane = markup.match(/<section class="minion-lane lane-enemy"[\s\S]*?<\/section>/)?.[0] ?? "";
    const friendlyLane = markup.match(/<section class="minion-lane lane-player"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(enemyLane.includes("minion-enemy is-targetable")).toBe(enemyMinion);
    expect(friendlyLane.includes("minion-friendly is-targetable")).toBe(friendlyMinion);
    expect(markup.includes("hero-target-button")).toBe(enemyHero);
    battle.enemyBoard = [];
    const emptyMarkup = render();
    const handCard = emptyMarkup.match(/<button[^>]*data-effect-instance-id="spell"[^>]*>/)?.[0];
    expect(handCard).toContain("card-spell");
    expect(handCard?.includes('disabled=""')).toBe(cardId === "reaper-cleave" || cardId === "soul-lance");
    if (cardId === "fate-shard") expect(emptyMarkup).toContain("hero-target-button");
  });

  it.each(["player-hero", "player", null])("highlights only the player hero for an enemy hero spell with target %s", (targetId) => {
    const run = createRun(923);
    run.battle!.playerBoard = [{ instanceId: "survivor", cardId: "ash-wolf", owner: "player", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false }];
    const markup = renderToStaticMarkup(
      <GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: false }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={true} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()}
        enemyIntentStep={{ action: { type: "cast-spell", cardId: "shadow-bolt", instanceId: "bolt", handSlot: 0, effects: [{ kind: "damage", targetId }] }, beforeRun: run, presentationRun: run }} />,
    );
    expect(markup).toContain('class="hero-panel hero-player is-intent-target"');
    expect(markup).not.toMatch(/class="minion-card[^"]*is-intent-target/);
    expect(markup).toContain("내 영웅");
  });

  it("shows the opening hand redraw only while it remains available and disables it during resolution", () => {
    const run = createRun(411);
    const renderBoard = (actionsDisabled: boolean) => renderToStaticMarkup(
      <GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} actionsDisabled={actionsDisabled} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} onRedrawOpeningHand={vi.fn()} />,
    );
    const availableMarkup = renderBoard(false);
    const deckCountsIndex = availableMarkup.indexOf('class="deck-counts"');
    const discardCountIndex = availableMarkup.indexOf("버림");
    const redrawIndex = availableMarkup.indexOf('class="opening-hand-redraw-control"');
    const handHeadingIndex = availableMarkup.indexOf('class="hand-heading"');
    expect(redrawIndex).toBeGreaterThan(deckCountsIndex);
    expect(redrawIndex).toBeGreaterThan(discardCountIndex);
    expect(redrawIndex).toBeLessThan(handHeadingIndex);
    expect(availableMarkup).toContain('aria-label="시작 손패 다시 뽑기"');
    expect(availableMarkup).toContain("손패를 1회 다시 뽑습니다");
    expect(availableMarkup).not.toContain(">시작 손패 다시 뽑기</button>");
    expect(renderBoard(true)).toContain('class="opening-hand-redraw-button" type="button" aria-label="시작 손패 다시 뽑기" aria-describedby="opening-hand-redraw-tooltip" disabled=""');
    run.openingHandRedrawAvailable = false;
    expect(renderBoard(false)).not.toContain('class="opening-hand-redraw-control"');
  });

  it("renders both heroes, two six-slot lanes, mana, hand, and turn control", () => {
    const markup = renderToStaticMarkup(
      <GameBoard
        run={createRun(412)}
        turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );

    expect(markup).toContain("class=\"hero-panel hero-enemy\"");
    expect(markup).toContain("망고스톤 홈");
    expect(markup).toContain("> 망고스톤</a>");
    expect(markup).toContain("aria-label=\"잿빛 방랑자 영웅\"");
    expect(markup.match(/class="lane-slot/g)).toHaveLength(12);
    expect(markup).toContain("마나");
    expect(markup).toContain("손패");
    expect(markup).toContain("턴 종료");
    expect(markup).toContain("공격");
    expect(markup).toContain("체력");
  });

  it("keeps minion cards playable until all six friendly slots are occupied", () => {
    const run = createRun(413);
    run.battle!.hand = [{ instanceId: "extra-card", cardId: "ash-wolf" }];
    run.battle!.playerBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => ({
      instanceId: `friendly-${index}`,
      cardId: "bone-rat",
      owner: "player" as const,
      attack: 1,
      health: 1,
      maxHealth: 1,
      summonedTurn: 0,
      hasAttacked: false,
    }));
    const markup = renderToStaticMarkup(
      <GameBoard
        run={run}
        turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );
    const handCard = markup.match(/<button class="game-card card-minion"[^>]*data-effect-instance-id="extra-card"[^>]*>/)?.[0];
    expect(handCard).toContain("disabled=\"\"");
  });

  it("shows the hidden enemy hand and resources without leaking card identities", () => {
    const renderBoard = (run: ReturnType<typeof createRun>) => renderToStaticMarkup(
      <GameBoard
        run={run}
        turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );
    const run = createRun(413);
    run.battle!.enemyHand = [{ instanceId: "secret-instance-1", cardId: "eclipse" }, { instanceId: "secret-instance-2", cardId: "shadow-bolt" }];
    run.battle!.playerMana = { current: 7, max: 10, temporary: 2 };
    run.battle!.enemyMana = { current: 7, max: 10, temporary: 3 };
    run.battle!.enemyDrawPile = run.battle!.enemyDrawPile.slice(0, 12);
    run.battle!.enemyDiscardPile = [{ instanceId: "enemy-discard", cardId: "ash-wolf" }];
    const markup = renderBoard(run);
    expect(markup).toContain("aria-label=\"적 손패 2장\"");
    expect(markup.match(/class="enemy-card-back"/g)).toHaveLength(2);
    expect(markup).toContain("마나 7/10, 임시 마나 3");
    expect(markup).toContain("마나 7/10, 임시 마나 2");
    expect(markup.match(/mana-orb is-full is-temporary/g)).toHaveLength(5);
    expect(markup).toContain("적 덱 12장, 적 버린 카드 1장");
    expect(markup).not.toContain("eclipse");
    expect(markup).not.toContain("shadow-bolt");
  });

  it("places the timer after TURN, hides it during effects, and marks five seconds as critical", () => {
    const renderTimer = (turnTimer: { text: string; remainingSeconds: number; visible: boolean }) => renderToStaticMarkup(
      <GameBoard
        run={createRun(414)}
        turnTimer={turnTimer}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );
    const normal = renderTimer({ text: "00:20", remainingSeconds: 20, visible: true });
    expect(normal.indexOf("TURN 1")).toBeLessThan(normal.indexOf("00:20"));
    expect(normal).toContain("aria-label=\"남은 시간 20초\"");
    expect(normal).not.toContain("turn-timer is-critical");

    const hidden = renderTimer({ text: "00:12", remainingSeconds: 12, visible: false });
    expect(hidden).toContain("turn-timer is-hidden");
    expect(hidden).toContain("aria-hidden=\"true\"");

    const critical = renderTimer({ text: "00:05", remainingSeconds: 5, visible: true });
    expect(critical).toContain("turn-timer is-critical");
  });

  it("adds the board-edge warning only while the visible timer has five or fewer seconds", () => {
    const renderBoard = (remainingSeconds: number, visible: boolean) => renderToStaticMarkup(
      <GameBoard
        run={createRun(415)}
        turnTimer={{ text: `00:${String(remainingSeconds).padStart(2, "0")}`, remainingSeconds, visible }}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );

    expect(renderBoard(5, true)).toContain('class="battle-board is-player-turn is-timer-critical"');
    expect(renderBoard(6, true)).toContain('class="battle-board is-player-turn"');
    expect(renderBoard(5, false)).toContain('class="battle-board is-player-turn"');
    expect(renderBoard(1, true)).toContain('class="battle-board is-player-turn is-timer-critical"');
  });

  it("shows the selected class power and Demonist shards while keeping legacy runs compatible", () => {
    const legacyRun = createRun(416);
    delete legacyRun.playerClass;
    const legacy = renderToStaticMarkup(<GameBoard run={legacyRun} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(legacy).not.toContain("hero-power-button");

    const demonist = createRun(417, "demonist");
    demonist.battle!.playerArmor = 3;
    demonist.battle!.soulShards = 4;
    const markup = renderToStaticMarkup(<GameBoard run={demonist} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(markup).toContain("영혼 조각 4/6");
    expect(markup).toContain("hero-power-button");
    expect(markup).toContain("영혼 조각 3");
    expect(markup).toContain("방어도 3");
    const heroPanel = markup.slice(markup.indexOf('class="hero-panel hero-player'), markup.indexOf("</section>", markup.indexOf('class="hero-panel hero-player')));
    expect(heroPanel).toContain("hero-power-button");
    expect(markup.indexOf('class="hero-panel hero-player')).toBeLessThan(markup.indexOf('class="player-toolbar"'));
  });

  it("uses the selected class portrait and keeps the legacy hero portrait", () => {
    const renderPlayerPortrait = (run: ReturnType<typeof createRun>) => renderToStaticMarkup(
      <GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />,
    );

    expect(renderPlayerPortrait(createRun(420, "warrior"))).toContain('src="/art/heroes/warrior.png"');
    expect(renderPlayerPortrait(createRun(421, "assassin"))).toContain('src="/art/heroes/assassin.png"');
    expect(renderPlayerPortrait(createRun(422, "demonist"))).toContain('src="/art/heroes/demonist.png"');

    const legacyRun = createRun(423);
    delete legacyRun.playerClass;
    expect(renderPlayerPortrait(legacyRun)).toContain('src="/art/heroes/player.png"');
  });

  it("keeps selected cards actionable without opening a selection popup", () => {
    const run = createRun(424, "warrior");
    const selected = run.battle!.hand[0]!;
    const definition = CARD_BY_ID.get(selected.cardId)!;
    const markup = renderToStaticMarkup(
      <GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={selected.instanceId} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />,
    );

    expect(markup).not.toContain('class="hand-card-preview"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(`data-effect-card-id="${selected.cardId}"`);
    if (definition.minion) expect(markup).toContain(`공격 ${definition.minion.attack} · 체력 ${definition.minion.maxHealth}`);
  });

  it("allows Assassin power to target enemy minions and hero", () => {
    const assassin = createRun(418, "assassin");
    const markup = renderToStaticMarkup(<GameBoard run={assassin} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="hero-power" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(markup).toContain("그림자 습격");
    expect(markup).toContain("영웅 능력 대상을 선택하세요");
    expect(markup).toContain("타락한 엘프 정찰자을(를) 대상으로 선택");
  });

  it("lights All Attack only when the enemy board is empty and a friendly minion is ready", () => {
    const run = createRun(419);
    run.battle!.turnNumber = 2;
    run.battle!.playerBoard = [{ instanceId: "ready", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    const ready = renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(ready).toContain('class="all-attack-button is-ready"');
    expect(ready).toContain("⚔</span> 전체 공격");
    expect(ready).not.toContain("field-action-bar");
    // PC layout: the all-attack button sits in the player toolbar, directly before the end-turn button.
    expect(ready.indexOf('class="player-toolbar"')).toBeLessThan(ready.indexOf('class="all-attack-button is-ready"'));
    expect(ready.indexOf('class="all-attack-button is-ready"')).toBeLessThan(ready.indexOf('class="end-turn-button"'));

    run.battle!.enemyBoard = [{ instanceId: "blocker", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    const blocked = renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(blocked).toContain('class="all-attack-button is-unavailable"');
  });

  describe("turn indicator", () => {
    const renderBoard = (options: { enemyTurnActive?: boolean; activeSide?: "player" | "enemy"; status?: "active" | "playerWon" | "playerLost" }) => {
      const run = createRun(421);
      if (options.activeSide) run.battle!.activeSide = options.activeSide;
      if (options.status) run.battle!.status = options.status;
      return renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:30", remainingSeconds: 30, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} {...(options.enemyTurnActive !== undefined ? { enemyTurnActive: options.enemyTurnActive } : {})} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    };

    it("shows the player's turn badge and board border by default", () => {
      const markup = renderBoard({});
      expect(markup).toContain('class="turn-badge is-player"');
      expect(markup).toContain(">내 턴</span>");
      expect(markup).toContain("battle-board is-player-turn");
    });

    it("shows the enemy's turn while its turn is replayed or when it is the active side", () => {
      for (const markup of [renderBoard({ enemyTurnActive: true }), renderBoard({ activeSide: "enemy" })]) {
        expect(markup).toContain('class="turn-badge is-enemy"');
        expect(markup).toContain(">상대 턴</span>");
        expect(markup).toContain("battle-board is-enemy-turn");
      }
    });

    it("hides the badge once the battle is over", () => {
      const markup = renderBoard({ status: "playerWon" });
      expect(markup).not.toContain("turn-badge");
      expect(markup).not.toContain("is-player-turn");
    });
  });

  describe("button layout", () => {
    // This file renders in a node environment: provide a minimal `window.matchMedia` for the compact-layout hook.
    const render = (compact: boolean) => {
      const globals = globalThis as { window?: unknown };
      const original = globals.window;
      globals.window = { matchMedia: (query: string) => ({ matches: compact && query === "(max-width: 760px)", media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) };
      try {
        const run = createRun(420);
        run.battle!.turnNumber = 2;
        run.battle!.playerBoard = [{ instanceId: "ready", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
        run.battle!.enemyBoard = [];
        return renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:30", remainingSeconds: 30, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
      } finally {
        if (original === undefined) delete globals.window;
        else globals.window = original;
      }
    };

    it("keeps the end-turn button in the toolbar next to all-attack on wide screens", () => {
      const markup = render(false);
      expect(markup.match(/class="end-turn-button"/g)).toHaveLength(1);
      expect(markup).not.toContain("hero-end-turn-button");
      expect(markup.indexOf('class="all-attack-button is-ready"')).toBeLessThan(markup.indexOf('class="end-turn-button"'));
    });

    it("moves the end-turn button above the player portrait on phone-width screens", () => {
      const markup = render(true);
      expect(markup.match(/턴 종료/g)).toHaveLength(1);
      const heroPanel = markup.match(/<section class="hero-panel hero-player[\s\S]*?<\/section>/)?.[0] ?? "";
      expect(heroPanel).toContain("hero-end-turn-button");
      expect(heroPanel.indexOf("hero-end-turn-button")).toBeLessThan(heroPanel.indexOf("hero-portrait-wrap"));
      const toolbar = markup.slice(markup.indexOf('class="player-toolbar"'));
      expect(toolbar.slice(0, toolbar.indexOf("</footer>"))).toContain('class="all-attack-button is-ready"');
      expect(toolbar.slice(0, toolbar.indexOf("</footer>"))).not.toContain("end-turn-button");
    });
  });

  it("keeps the boss area-attack cadence and targets visible throughout the boss battle", () => {
    const run = createRun(414);
    run.battle!.enemyId = "boss-blood-matron";
    const markup = renderToStaticMarkup(
      <GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />,
    );
    expect(markup).toContain("data-testid=\"boss-pattern-panel\"");
    expect(markup).toContain("3·6·9번째 턴");
    expect(markup).toContain("내 하수인과 영웅 모두에게 피해 1");
  });

  it("names the boss area-attack turns that match the difficulty", () => {
    const hard = createRun(414, "warrior", "hard");
    hard.battle!.enemyId = "boss-blood-matron";
    const markup = renderToStaticMarkup(
      <GameBoard run={hard} turnTimer={{ text: "00:30", remainingSeconds: 30, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />,
    );
    expect(markup).toContain("2·4·6번째 턴");
    expect(markup).not.toContain("3·6·9번째 턴");
  });
});
