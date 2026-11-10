# LUMILASH: CLASSIC SKY RAID — V5

Original polished classic vertical-scrolling propeller-aircraft shooter; NOT a spaceship game, auto-survivor, low-detail sprite game, or licensed remake.

## Controls
- **Phone/tablet:** touch and hold on the field to fire, drag left or right to steer; release to stop all new shots.
- **Desktop:** hold mouse button to fire and move mouse left/right, or A/D/arrows to move and hold Space/J to shoot.
- **3 tactical modes:** tap FIRE MODE button (or press 1/2/3 or M) to select WIDE (spread shots), FOCUS (high damage vs armored foes/boss), or PIERCE (penetrate dense columns).
- **AIR RAID:** manually trigger with Q or the round button after earning 100% charge.
- **Pause:** deliberate Esc/P on keyboard or hold the small pause icon for 700 ms. Ordinary tap must not pause. There is no automatic blur pause.
- **Automatic milestone upgrades** apply without pausing or opening a blocking menu. The player keeps control and chooses tactical mode instead.

## Experience and balance
- Original layered scrolling countryside: farmland, roads, rural houses, forests, bridges, a curving river, moving soft clouds.
- The player's unique navy-and-silver fighter is anchored along the bottom rail; colorful enemy propeller planes attack from above in staggered formations and armored types.
- Five rising waves over a 210-second round, three large ace bombers, chain explosions, several cannon modes and a manually charged wide AIR RAID.
- Rebalanced starting pressure and base leak threshold to avoid rapid involuntary game-over. No auto-kills: actual enemy kills require a manual projectile or its triggered effects.
- Original browser-synth music and arcade cannon effects. No copyrighted audio samples or downloaded music.

## Regression evidence
- Four screen sizes: 907×510, 390×844, 320×568, 1280×720.
- Scripted browser test asserts 30 seconds without input is NOT game-over and has 0 shots / 0 kills, blur does not pause, one tap cannot pause, deliberate long hold pauses, explicit continue resumes.
- Fire input/release, uninterrupted level-up, manual special, tactical mode selection and >65 seconds of continuous simulated play are checked.
- These tests do not establish real-world player enjoyment, physical-iPhone thermal performance, or acceptance by CrazyGames.

## Publication protocol
Static HTML5 application with CrazyGames SDK v3 bridge. Previous versions are archived. The new V5 browser release and matching gameplay cover/trailers are the next submission candidate after FRUITY NET. Preparation is not formal submission or approval.

## V6 Unstoppable Assault (2026-11-11)
- New sinister (dark aircraft/red-glowing eyes) air enemies, including spiked zig jets and armored bombers, built as original antialiased vector sprites cached to Canvas offscreens.
- Enemy bands fill all horizontal lanes in thick continuous formations, with 440 mobile / 820 wider active population caps.
- Per-frame collision code is now a 48px spatial hash grid with swept bullet collision and localized chain explosions, replacing O(shots × all enemies) iteration. Render sprites are reusable images rather than hundreds of per-frame path rebuilds.
- Terrain is cached and repainted every third frame, while the aircraft, controls and shots update each frame.
- Dedicated mobile touchstart/touchmove (global)/touchend with preventDefault and a brief touchcancel recovery; window mouse drag continues beyond the canvas. Full-size touch controls do not cause scrolling.
- Faster uninterrupted manually held bullet output, three attack modes, no passive shots, automatic nonblocking upgrades, explicit pause only, more tolerant airfield survival.
- QA must check true input holding across the screen, no unsolicited pause, real continuous fire, high density, no errors, and representative performance.
