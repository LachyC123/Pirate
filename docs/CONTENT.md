# Content ledger

An item counts once it can be obtained, equipped, displayed and used.
"Playtested" means exercised through the touch UI by the scripted runs (`npm run playtest`, `npm run career`) in headless Chromium at iPhone viewport sizes. Nothing here has been tested on a physical iPhone yet.

## Totals after Pass 2

| | Target | Implemented | Playtested |
|---|---|---|---|
| Weapon families | 8 | 7 | 7 by AI opponents; 5 in the player's hand (hanger, pike, hook, paired, anchor) |
| Weapons | ~48 | 16 | see table |
| Wearables (hat, coat, off hand) | 30 | 11 | 9 |
| Charms, boots | 12 + boots | 0 | 0 |
| Friendly AI archetypes | 12 | 6 | 6 |
| Arenas | 5 | 1 (crowd grows with each cup) | 1 |
| Tournaments | 20 | 4 (the whole Tarwater Docks circuit) | 4 |

## Weapons

| ID | Name | Family | How obtained | In the player's hand |
|---|---|---|---|---|
| chipped_hanger | Chipped Hanger | Hanger | Starting kit | Playtested |
| gull_sticker | Gull-Sticker | Boarding pike | Smith, 30 | Playtested |
| fishwifes_pair | Fishwife's Pair | Paired blades | Smith, 40 | Playtested |
| powder_promise | Powder & Promise | Pistol & sabre | Smith, 45 | Unit-tested and simulated; not bought in a scripted run |
| caulking_mallet | Caulking Mallet | Maul | Smith, 50 | Unit-tested and simulated |
| kedge_chain | Kedge & Chain | Anchor | Smith after Tar Bucket Cup, 65 | Playtested |
| widows_knife | Widow's Kitchen Knife | Hanger | Smith, 70 | Simulated |
| long_tom | Long Tom | Boarding pike | Smith after Tar Bucket Cup, 120 | Simulated |
| port_starboard | Port and Starboard | Paired blades | Smith after Ropewalk Stakes, 135 | Playtested |
| capstan_bar | Capstan Bar | Maul | Smith after Cooper's Purse, 140 | Simulated |
| dockmasters_due | Dockmaster's Due | Anchor | Smith after Ropewalk Stakes, 170 | Playtested |
| last_word | Last Word | Pistol & sabre | Smith after Cooper's Purse, 180 | Simulated |
| towline | Moll's Towline | Hook & line | Tar Bucket Cup prize | Playtested |
| coopers_persuader | Cooper's Persuader | Maul | Cooper's Purse prize | Won in both runs; simulated in hand |
| tansys_hitches | Tansy's Hitches | Paired blades | Ropewalk Stakes prize | Won in both runs; simulated in hand |
| moorings_bower | Mooring's Bower | Anchor | Mooring Night prize | Won in both runs |

Still to build: cursed instruments (the Drowned Opera family).

## Wearables

| ID | Name | Slot | Effect | Price | State |
|---|---|---|---|---|---|
| knit_cap | Knit Cap | Hat | +3 health | 12 | Playtested |
| straw_hat | Straw Hat | Hat | +1 stamina | 18 | Playtested |
| red_bandana | Red Bandana | Hat | +2 health, +1 stamina | 26 | Playtested |
| tricorn | Borrowed Tricorn | Hat | +1 Guile | 65 | Playtested |
| diving_helmet | Brass Diving Helmet | Hat | hits land 1 lighter, −1 stamina | 110, after Cooper's Purse | Playtested |
| patched_vest | Patched Vest | Coat | +4 health | 25 | Playtested |
| short_coat | Ferryman's Short Coat | Coat | +7 health | 55 | Playtested |
| tarred_greatcoat | Tarred Greatcoat | Coat | +4 health, hits land 1 lighter | 120, after Ropewalk Stakes | Playtested |
| belaying_pin | Belaying Pin | Off hand | Pin Crack: ignores a brace | 20 | Unit-tested |
| buckler | Hatch-Cover Buckler | Off hand | blocks 2 more when braced; Buckler Bash drains 2 stamina | 40 | Playtested |
| storm_lantern | Storm Lantern | Off hand | Lantern Dazzle: −25% to their next attack | 45, after Tar Bucket Cup | Unit-tested |

Pistol-and-sabre and paired blades fill both hands: an off-hand piece stays on the belt while they are equipped, and the shop says so.

## Opponents

| Who | Weapon | Behaviour | State |
|---|---|---|---|
| Patient dock guard | Pike | Holds two spaces, shoves when crowded | Playtested |
| Impatient fishmonger | Hanger | Charges, swings until winded | Playtested |
| Nervous powder boy | Pistol | Fires while loaded, backs away after | Playtested |
| Cooper's apprentice (after Tar Bucket Cup) | Maul | Slow, breaks braces | Playtested |
| Twin-blade fishwife (after Tar Bucket Cup) | Paired | Follows up every cut that lands | Playtested |
| Sleepy anchor watch (after Cooper's Purse) | Anchor | Throws, then drags it home through you | Playtested |

## Tournaments: Tarwater Docks

| Cup | Bouts | Champion and telegraph | Counter | Prize |
|---|---|---|---|---|
| Tar Bucket Cup | Nib Pike, Pistol Pip | Old Moll Towline: chain runs taut, hauls next turn | Brace, or close in so it goes slack | 40 gold, Moll's Towline |
| Cooper's Purse | Barrel Bess, Splint Jenny | Cooper Gantry: plants his feet, Hoop Driver next turn on the space in front of him. Breaks a brace | Step back: it buries itself in the deck and costs him stamina | 70 gold, Cooper's Persuader |
| Ropewalk Stakes | Hemp Odran (anchor, introduced here before the headliner uses it), Tallow Wick | Twin-Knot Tansy: crosses blades, rushes up to three spaces and cuts twice | Brace to turn both, or be more than three spaces away | 100 gold, Tansy's Hitches |
| Mooring Night | Bosun Crake (maul), Ferry Kate (hook), Deacon Shoal (pike) | Mother Mooring: her anchor stays where it lands; reeling it in strikes and drags anything on that space or nearer | Step back past the mark, or brace | 150 gold, Mooring's Bower |

Each cup adds a pennant over the gate, a trophy on the harbour shelf (tar bucket, hoop, rope coil, anchor), a cursed coin, more spectators at the rail, new friendly opponents and new shop stock.

Planned (Pass 3): Lantern Quay, The Wreck Court, The Drowned Opera, The Black Mint, four cups each.

## Places

| Place | State |
|---|---|
| Gallowswake harbour | Implemented: pennants, trophies, purse, poster, onlookers follow progress |
| Peg Mallory's weaponsmith | Implemented, three racks |
| Ezra Thimble's armoury (sailmaker) | Implemented, three racks: hats, coats, off-hand gear |
| Arena gate, Tarwater Docks arena | Implemented |
| Tattooist, ship's surgeon | Signs only; say so when tapped |

## Progression runs

Pending: `npm run career` results are recorded here once the two scripted careers finish.

## Known gaps after Pass 2

- No boots or charms yet. Friendly wager duels are not built.
- The "lost at sea" choice changes the intro, the purse and each coin line. The ending illustration is not built.
- NPCs do not use off-hand gear or wearables for stats (Mother Mooring has a tarred coat's 1 soak built in).
- Art is still a procedural pass: fighters are small in the arena, swing arcs are per family, one arena backdrop for all four cups.
- Sound is synthesised placeholders. No music.
- Balance comes from bot simulation and two scripted careers, not from people. The bots answer every telegraph correctly, so real first attempts will be harder than these numbers.
