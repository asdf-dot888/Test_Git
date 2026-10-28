import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRun } from "@board-game/game-core";
import { GameBoard } from "./GameBoard.js";

describe("GameBoard", () => {
  it("renders both heroes, two five-slot lanes, mana, hand, and turn control", () => {
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
    expect(markup).toContain("aria-label=\"잿빛 방랑자 영웅\"");
    expect(markup.match(/class="lane-slot/g)).toHaveLength(10);
    expect(markup).toContain("마나");
    expect(markup).toContain("손패");
    expect(markup).toContain("턴 종료");
    expect(markup).toContain("공격");
    expect(markup).toContain("체력");
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

    expect(renderBoard(5, true)).toContain('class="battle-board is-timer-critical"');
    expect(renderBoard(6, true)).toContain('class="battle-board"');
    expect(renderBoard(5, false)).toContain('class="battle-board"');
    expect(renderBoard(1, true)).toContain('class="battle-board is-timer-critical"');
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
    expect(markup).toContain("방어도 3");
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
    expect(ready.indexOf('class="all-attack-button is-ready"')).toBeLessThan(ready.indexOf('class="battle-opponent"'));
    expect(ready).toContain("⚔</span> 전체 공격");
    expect(ready.indexOf('class="all-attack-button is-ready"')).toBeLessThan(ready.indexOf('class="player-toolbar"'));

    run.battle!.enemyBoard = [{ instanceId: "blocker", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    const blocked = renderToStaticMarkup(<GameBoard run={run} turnTimer={{ text: "00:20", remainingSeconds: 20, visible: true }} selectedCardInstanceId={null} selectedAttackerId={null} targetMode="none" isResolving={false} error={null} onSelectCard={vi.fn()} onSelectTarget={vi.fn()} onDiscardCard={vi.fn()} onCancelTarget={vi.fn()} onEndTurn={vi.fn()} onMenu={vi.fn()} />);
    expect(blocked).toContain('class="all-attack-button is-unavailable"');
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
});
