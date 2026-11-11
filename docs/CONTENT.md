# Content ledger

An item counts once it can be obtained, equipped, displayed and used.
"Playtested" means exercised through the touch UI by `npm run playtest` (headless Chromium at iPhone viewport sizes). Nothing here has been tested on a physical iPhone yet.

## Totals

| | Target | Implemented | Playtested |
|---|---|---|---|
| Weapon families | 8 | 4 | 3 (hanger, pike, hook) |
| Weapons | ~48 | 7 (5 obtainable now, 2 shown as locked stock) | 3 |
| Wearables | 30 | 0 obtainable (NPCs wear 5 hats, 2 coats) | 0 |
| Charms | 12 | 0 | 0 |
| Friendly AI archetypes | 12 | 3 | 3 |
| Arenas | 5 | 1 | 1 |
| Tournaments | 20 | 1 complete, 1 with first bout only | 1 + first bout |

## Weapons

| ID | Name | Family | How obtained | State |
|---|---|---|---|---|
| chipped_hanger | Chipped Hanger | Hanger | Starting kit | Playtested |
| gull_sticker | Gull-Sticker | Boarding pike | Smith, 30 gold | Playtested |
| powder_promise | Powder & Promise | Pistol & sabre | Smith, 45 gold | Implemented, unit-tested, used by AI; not bought in the scripted run |
| widows_knife | Widow's Kitchen Knife | Hanger | Smith, 70 gold | Implemented; used by Barrel Bess |
| towline | Moll's Towline | Hook & line | Tar Bucket Cup prize, guaranteed | Playtested |
| long_tom | Long Tom | Boarding pike | Smith after Tar Bucket Cup, 120 gold | Implemented |
| last_word | Last Word | Pistol & sabre | Smith after Cooper's Purse | Visible but locked: Cooper's Purse cannot be won yet |

Planned families: paired blades, mauls and capstans, anchors and chains, cursed instruments.

## Opponents

| Who | Style | State |
|---|---|---|
| Patient dock guard | Holds two spaces, shoves when crowded | Playtested |
| Impatient fishmonger | Charges, swings until winded | Playtested |
| Nervous powder boy | Fires while loaded, backs away after | Playtested |
| Nib Pike (qualifier) | Spear range | Playtested |
| Pistol Pip (qualifier) | Opening shot on turn one | Playtested |
| Old Moll Towline (champion) | Cast, then haul; telegraphed one turn ahead | Playtested |
| Barrel Bess (Cooper's Purse, bout 1) | Careful hanger, braces and ripostes | Playtested |

## Tournaments

| Circuit | Tournament | State |
|---|---|---|
| Tarwater Docks | Tar Bucket Cup | Complete, playtested |
| Tarwater Docks | Cooper's Purse | First bout only. Pays a small purse, awards no title, says so in the game |
| Tarwater Docks | 2 more, ending with Mother Mooring | Planned (Pass 2) |
| Lantern Quay, The Wreck Court, The Drowned Opera, The Black Mint | 4 each | Planned (Pass 3) |

## Places

| Place | State |
|---|---|
| Gallowswake harbour (pennants, purse, poster, onlookers change with titles) | Implemented |
| Peg Mallory's weaponsmith | Implemented |
| Arena gate, Tarwater Docks arena | Implemented |
| Sailmaker's armoury | Door only; boarded up, says so when tapped |
| Tattooist, ship's surgeon | Signs only; say so when tapped |

## Known gaps after Pass 1

- No wearables, off-hand choices or charms for the player yet. The renderer already draws hats, coats and the diving helmet (which replaces hair).
- The "lost at sea" choice changes the intro, the purse and each coin line. The ending illustration is not built.
- Art is a first procedural pass. Needs an art pass: larger fighters in the arena, per-weapon swing arcs, more merchant expressions, crowd variety.
- Sound is synthesised placeholders. No music.
- Balance is tuned by bot simulation and one scripted run, not by people.
- Wager duels, armour fitting, further circuits: later passes.
