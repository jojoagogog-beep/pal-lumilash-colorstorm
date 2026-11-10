# LUMILASH: FRONTLINE COLORSTORM (V4)
A completely rebuilt original manual-firing bottom-rail arcade shooter. The old top-down auto-survivor V3 was abandoned in response to direct user feedback.

## The actual gameplay
- The star cannon is always on the bottom rail; large colorful enemy formations enter from the TOP.
- Mouse: move to aim in a vertical firing lane, hold left button to fire.
- Touch: touch and HOLD on playfield, drag horizontally to shift the cannon and target lane; release to stop firing.
- Keyboard: A/D or left/right arrows to move; hold Space or J to fire; Q activates PRISM CANNON when charged; P/Escape pauses.
- **Absolutely NO auto-fire.** No shot and no KO happens without user-triggered input or an already active, previously fired projectile.
- Direct plasma impacts, meaningful chain explosions, real individual enemy kills, armored glimmers, zigzag glimmers, volatile explosive glimmers.
- Each breach damages the bottom base, with a tolerable leak threshold. Survive 5 increasingly crowded waves over 160 seconds, including 3 boss encounters.
- Level-up draft of 3 weapon upgrades: extra barrels, fire rate, pierce, chain splash, damage, wider shots, special power and base repair.
- Charge the manually triggered PRISM CANNON by actually killing enemies.
- Original 5-part adaptive browser-synth score intensifies with attacks, crowd density, combo streaks, new waves and bosses. Dedicated laser shot effects, manual prism burst and victory/defeat stings.

## QA and release
QA evidence is in ../qa_v4/manual_game_qa.json. Four browser screen-size tests covered idle zero-fire/zero-KO behavior, manual pointer/touch controls, release stops firing, charged special, upgrade selection, boss, audio and JS errors. All are scripted/browser-emulated, not proof of real-player fun or device-specific FPS. An independent human playtest and official CrazyGames approval are still not verified.

Project uses the original PALCrazy SDK v3 lifecycle bridge; no mandatory ads or third-party dependencies apart from optional portal SDK. Game language and controls are in English for CrazyGames.
