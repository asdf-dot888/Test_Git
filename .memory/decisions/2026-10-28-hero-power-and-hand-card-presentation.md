# Decisions: Hero Power and Hand Card Presentation

- Date: 2026-10-28
- Status: Confirmed

## D01. Hero Power Illustrations
- **Chosen**: Replace the class glyph in the existing hero power button with a distinct generated illustration for each class ability. Keep the existing cost and description popover.
- **Rationale**: The button should communicate the ability visually while preserving its compact placement beside the hero portrait and retaining the current explanation.
- **Art direction**: Dark fantasy consistent with the game. Show an ability-specific action: the Warrior defending with a shield, the Assassin striking from shadow, and the Demonist summoning an imp. Keep the established class presentation: male Warrior and female Assassin and Demonist, all adults.

## D02. Hand Card Height
- **Chosen**: Keep the current hand card width and increase its height to 1.5 times the current size across responsive breakpoints.
- **Rationale**: The hand feels too small vertically; more height gives card artwork and details room without reducing the number of cards visible horizontally.

## D03. Hand Card Artwork Fit
- **Chosen**: Show the entire source illustration without cropping, fitting it inside the card art area while preserving its aspect ratio.
- **Rationale**: Card art assets include both square and portrait images, so cropping hides important parts of some illustrations.

## D04. Card Hover Preview
- **Chosen**: On mouse hover, show the complete card enlarged to about 1.5 times its hand size, including its artwork, name, mana cost, type, minion attack and health when applicable, and full effect description. Do not show a card detail popup merely because the card is selected.
- **Rationale**: The player can inspect the full card by hovering without confusing inspection with the existing click-to-select and play flow.
- **Interaction notes**: Clicking still selects the card for the existing play/targeting flow. The hover preview must remain visible outside the horizontally scrolling hand area and stay within the viewport.
