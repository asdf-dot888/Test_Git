# Decisions: Mobile Card UX and Opening Hand Redraw

- Date: 2026-10-29
- Status: Confirmed

## D01. Missing card artwork
- **Chosen**: Add artwork for all four catalog cards whose referenced image files are missing: `fate-shard` (운명의 파편), `reaper-cleave` (수확자의 칼날), `soul-bargain` (영혼의 거래), and `stolen-fate` (빼앗긴 운명).
- **Rationale**: These missing assets cause broken-image icons; two are visible in the supplied screenshot. The new illustrations should match the game's existing dark-fantasy art direction and depict each card's effect clearly.

## D02. Mobile card inspection
- **Chosen**: On touch devices, a short tap keeps the existing card action. A long press opens a full card-description popup, including for greyed-out/disabled hand cards. Apply this to cards in the hand, reward selection, and discard selection. On desktop, hovering any hand card opens its description even if the card is disabled because of insufficient mana or another restriction.
- **Rationale**: Players need to read long spell descriptions without changing the existing quick card interaction. A long press must not also trigger the card action.
- **Popup dismissal**: Close with an × button or by tapping the dimmed area outside the popup.

## D03. Opening hand redraw
- **Chosen**: On both desktop and mobile, at the beginning of the first battle of an expedition, offer one redraw of the entire 3-card starting hand. Show the redraw button near the hand from battle start until the player's first action. Hide and consume it immediately when used; if unused, hide it after the first action. Do not offer a redraw in later battles.
- **Rationale**: This lets players replace an unsatisfying opening hand once without delaying or interrupting the battle with a mandatory prompt, regardless of device.

## D04. Mobile layout pass
- **Chosen**: Review and fix mobile layout issues across the full game flow: main menu, expedition map, battle, rewards, and popups. Ensure long card descriptions remain fully readable, including in reward selection.
- **Rationale**: The reported clipping may occur in more than one screen, so the responsive layout needs a full-flow review rather than a single-card adjustment.

## D05. Disabled card preview on desktop
- **Chosen**: Desktop hover previews remain available for every hand card, including cards disabled because of insufficient mana or other play restrictions.
- **Rationale**: Disabled styling should communicate that a card cannot currently be played without preventing the player from inspecting its effect.

## D06. End turn after all attack
- **Chosen**: On desktop and mobile, after the all-attack sequence and its combat animations finish, automatically end the player's turn if the enemy hero is still alive. If the attack defeats the enemy hero, continue directly to the victory flow without ending the turn.
- **Rationale**: This makes the all-attack button a clear commit to finishing the turn while preserving the victory flow when the attacks are lethal.

## D07. Lethal attack and enemy hero defeat effect
- **Chosen**: When a player attack defeats the enemy hero, keep the battle visible while the final attack plays at half speed. Then show a new enemy hero defeat effect at half speed: the portrait cracks and collapses in red flame and black ash, with a slight screen shake.
- **Rationale**: The current run state switches to victory as soon as enemy health reaches zero, which hides the battle and makes the win feel abrupt. The defeat effect should be seen before the victory screen replaces the battle.

## D08. Victory screen reveal
- **Chosen**: After the enemy hero defeat effect completes, keep the battle as a dimmed background and reveal a large centered “승리” with a confirmation button. Play the victory reveal at half speed.
- **Rationale**: A dramatic full-screen victory moment gives the battle's final blow time to land while keeping the existing confirmation step before rewards.
