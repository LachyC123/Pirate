# Dead Man's Purse

A single-player, pixel-art pirate arena RPG for the iPhone browser. Create a pirate in rags, earn a better weapon in friendly matches, win tournaments, take each champion's signature weapon.

Status: **Pass 2, the complete Tarwater Docks circuit** (four tournaments, seven weapon families, armour fitting and off-hand gear). See [docs/CONTENT.md](docs/CONTENT.md) for what is built, planned and playtested.

## Run it

```bash
npm install
npm run dev        # dev server; open the printed Network URL on your iPhone (same Wi-Fi)
npm run build      # type-check + static build into dist/ (serve from any static host)
npm run preview    # serve the built dist/ on port 4173
```

Checks:

```bash
npm test           # 22 rule and career tests (resolver, AI legality, economy, prizes, wearables, saves)
npm run sim        # balance probe: bots fight thousands of duels per matchup
npm run playtest   # Pass 1 regression playthrough by taps in headless Chromium (needs `npm run preview` running)
npm run career     # two different builds each play the whole circuit by taps; writes docs/progression.json
```

## Controls

Touch only. No hover, keyboard or timing needed.

- **Harbour**: tap a doorway label (Weaponsmith, Armoury, Enter the Arena, Purse). In portrait the same destinations are also listed below the picture.
- **Shops**: tap a piece on the rack to see it on your pirate with what it changes. Buy, Equip, or Buy & Equip. "More items" turns to the next rack.
- **Duel**: one action per turn. Advance, Withdraw, Brace, Catch Breath, or Attack, which fans out the moves of the weapon in your hand (Back returns without spending the turn). Greyed cards say why they are illegal. The magnifier (top right) toggles Inspect: tap any action to read it without committing. Red deck spaces are threatened by the opponent; brass ones by you.
- **Pirate** tab: attributes, level-up points with concrete previews, kit, trophies. **⚙**: sound, reduced motion, new game.

## Duel rules in brief

Seven-space lane, one fighter per space, no passing. Health and stamina are the only resources. You regain 1 stamina at the end of your turn. Brace halves the next hit, resists shoves and hauls, and a blocked heavy move costs the attacker 2 stamina. Catch Breath is always legal. Paired blades pause after a cut lands to offer a paid Follow-Up. Guard breaks ignore a brace. A thrown anchor stays on its space until reeled in. Every champion's special is announced one turn ahead with its counter. The opponent AI reads only positions, stamina, weapons and your previous move, and uses the same resolver you do.

## Layout

```
src/core/     pure game: data (stable IDs), battle resolver, AI, career state, versioned save
src/art/      procedural pixel art: software pixel buffer, pirate paper-doll, weapons, backdrops, merchant, icons
src/scenes/   Phaser scenes: Create, Harbour, Shop, Gate, Battle (and its animation player)
src/ui/       shared DOM sheets and tabs
scripts/      balance sim, art preview, end-to-end playtest
tests/        vitest
docs/         content ledger and playtest screenshots
```

The resolver never touches rendering. A committed turn is resolved (player action, enemy reply, any reward) and saved before its animation starts; the save carries the events still to be shown, so closing Safari mid-swing replays the same outcome instead of rerolling it.

## Art and audio

All art is project-owned and generated in code (`src/art`); there are no image or audio files. Sound is synthesised with WebAudio after the first tap.
