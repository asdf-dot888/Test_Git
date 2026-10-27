import { renderToStaticMarkup } from "react-dom/server";
import { createRun } from "@board-game/game-core";
import { describe, expect, it, vi } from "vitest";
import { HeroPanel } from "./HeroPanel.js";

describe("HeroPanel", () => {
  it("renders the player hero from its PNG portrait", () => {
    const hero = createRun(1).battle!.playerHero;
    const markup = renderToStaticMarkup(
      <HeroPanel hero={hero} side="player" artKey="player" name="잿빛 방랑자" targetable={false} onSelectTarget={vi.fn()} />,
    );

    expect(markup).toContain('src="/art/heroes/player.png"');
    expect(markup).toContain('alt="잿빛 방랑자 초상화"');
    expect(markup).toContain(`aria-label="체력 ${hero.health}/${hero.maxHealth}"`);
  });

  it("renders a targetable boss PNG", () => {
    const hero = createRun(2).battle!.enemyHero;
    const markup = renderToStaticMarkup(
      <HeroPanel hero={hero} side="enemy" artKey="boss-grave-king" name="무덤의 왕" targetable onSelectTarget={vi.fn()} />,
    );

    expect(markup).toContain('src="/art/enemies/boss-grave-king.png"');
    expect(markup).toContain('class="hero-portrait-wrap"');
    expect(markup).toContain('aria-label="무덤의 왕을(를) 대상으로 선택"');
    expect(markup).toContain(`aria-label="체력 ${hero.health}/${hero.maxHealth}"`);
  });

  it("shows player armor alongside health", () => {
    const hero = createRun(3).battle!.playerHero;
    const markup = renderToStaticMarkup(<HeroPanel hero={hero} side="player" artKey="player" name="잿빛 방랑자" armor={4} targetable={false} onSelectTarget={vi.fn()} />);
    expect(markup).toContain('aria-label="방어도 4"');
  });
});
