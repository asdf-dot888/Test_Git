# Decisions: Soul Bargain Common Spell

- Date: 2026-10-28
- Status: Confirmed

## D01. Card identity and availability
- **Chosen**: Add a neutral 1-cost spell named “영혼의 거래” (Soul Bargain). It is available as a reward to all player classes and may appear in enemy random decks. It is not added automatically to the 30-card starting decks.
- **Rationale**: Make the risky mana acceleration a shared card choice while preserving the existing starting deck lists.

## D02. Spell effect and discard rules
- **Chosen**: On cast, discard one uniformly random card from the caster's remaining hand, then gain 3 temporary mana for this turn. The played spell is already removed from hand and is not a discard candidate. If there is no other card in hand, skip the discard and still grant the temporary mana. The discarded card goes to its owner's discard pile.
- **Rationale**: Preserve the spell's mana effect even when it is the caster's last card, while making the hand-loss cost explicit and consistent for either side.

## D03. Temporary mana behavior and display
- **Chosen**: Grant 3 temporary mana that can exceed the normal 10-mana maximum. Temporary mana is spent before regular mana; any unused temporary mana expires at the end of that side's turn, while unused regular mana remains. Display temporary mana with distinct-colored orbs and include it in the total available-mana display.
- **Rationale**: Ensure the full effect can be used at the mana cap and make the temporary resource visually distinct and understandable.

## D04. Enemy AI use
- **Chosen**: Enemy AI may use the spell when its post-discard hand still has another card to play and the temporary mana helps enable a follow-up action that turn.
- **Rationale**: Let enemies benefit from the common card without spending a card and discarding randomly when the mana cannot support another useful action.

## D05. Card artwork
- **Chosen**: Create a new square card illustration for `soul-bargain.png`, showing a demonic hand receiving an offered soul fragment. Use the recommended close-up composition focused on the hand, with cold blue-white soul light contrasted against red demonic fire. Match the existing detailed, painterly dark-fantasy card art. Keep the artwork free of text, card frames, and UI; the game renders those separately.
- **Rationale**: Make the exchange cost and demonic bargain readable at card size, while matching the existing card-art asset format and visual style.
