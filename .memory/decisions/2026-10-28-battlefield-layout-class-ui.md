# Battlefield Layout and Class UI

## Context

The battle screen currently gives too much space to the player's hand, leaves the battlefield feeling small, and requires vertical scrolling to see the full interface. The class ability control is hard to read, and the class selection screen does not show character illustrations.

## Decisions

### Battle screen layout

- Fit the complete battle screen in one viewport without vertical scrolling, including mobile portrait screens.
- Give the battlefield the largest practical share of the available height and reduce the hand area.
- Keep the hand in one compact horizontal row. On narrow screens, show several cards and let the player scroll the row horizontally to reach the rest.
- Keep each visible card's name, mana cost, attack, and health readable. Tapping a card opens a larger detail preview.
- Preserve the existing dark fantasy visual direction and mouse/touch interaction model.

### Class ability UI

- Put a class ability icon near the player's hero portrait.
- Activating the icon triggers the ability directly; show its cost and description in a compact popup.
- Make resource costs explicit: every class ability costs 2 mana. The Demonist ability also consumes 3 soul shards.
- Preserve existing ability targeting behavior: the Assassin chooses an enemy minion or hero after activation; the Warrior and Demonist abilities resolve without target selection.

### Hero illustrations and class selection

- Create a distinct hero portrait illustration for each class, framed around the face and shoulders so it remains recognizable at small sizes.
- Maintain a cohesive adult dark fantasy art direction. The Warrior is male; the Assassin and Demonist are female.
- Show all three portraits in their respective class choice cards. Keep the selected class's ability description below the choices.

## Acceptance Criteria

- The battle board, hand, and controls fit without vertical scrolling on desktop and mobile portrait viewports.
- The battlefield is visibly larger than the hand region.
- The hand remains one row; horizontal scrolling reaches cards that do not fit, and visible cards retain name, cost, attack, and health.
- Selecting a hand card exposes a larger detail preview.
- The hero ability icon is near the hero portrait and its popup clearly distinguishes 2 mana from the Demonist's additional 3 soul shards.
- Ability activation preserves the current class-specific targeting and resource rules.
- The class selection screen displays a distinct illustration for each class and shows the selected class's ability description below.

## Out of Scope

- Changing class ability mechanics, card balance, or combat rules.
- Adding or changing game modes, cards, or progression systems.
