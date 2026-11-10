# LUMILASH: COLORSTORM

An original bright, characterful, browser-first horde-survival arcade game.

**Ready to test:** HTML5 Canvas + original procedural character art and game soundtrack. No imported copyrighted images, music samples, remote player tracking or dependencies. All gameplay art is procedurally illustrated in Canvas/Pillow.

## Controls
Desktop: WASD or arrows to move. The petal blades attack automatically. Press Space when the colorful PRISM BURST meter reaches 100%. P/Escape pauses; number 1/2/3 picks upgrades.
Mobile: Touch and drag anywhere on the arena to steer with a virtual joystick; tap PRISM BURST when charged. Pause and upgrade choices are touch-enabled.
If you stand still, the swarm will encircle you. Moving, picking upgrades and timing your burst matter.

## Features
- Five original pastel worlds (Sunbloom Garden, Citrus Daydream, Sugar Cloud Parade, Peach Sunset, Galaxy Carnival)
- 8 enemy classes: jelly, rush, puff, tank, spitter, splitter, mini and boss
- 10 upgrade families with multiple levels and three-choice draft
- Bloom goals, XP crystals, orbiting sword petals, directional wide slashes, chain pops and manually triggered multi-kill super burst
- Boss per world, 5 unlockable zones, local progress/high score, defeat/retry/results
- Original WebAudio tracks composed as a multivoice five-world synth score with drums and custom action SFX
- Pause/resume and CrazyGames SDK v3 start/stop events; no ad requests during Basic Launch
- Initial download below 1MB, offline game engine (CrazyGames SDK is optional outside that platform), supports mobile/desktop and constrained 907x510 iframe

## Important
Submission status: prepared for next application, not submitted to CrazyGames. Automated browser QA is not a substitute for third-party human playtesting or formal CrazyGames QA.

## Release
Use submission/LUMILASH_COLORSTORM_CRAZYGAMES_V1.zip.
Cover files and muted 17.5-second gameplay recordings are in submission/. Do not include qa/, tools/, or submission/frames_*/ inside the web build.

## V2 Flow Rush & adaptive score (2026-11-10)
- Continuous skillful movement charges a visible PETAL FLOW gauge. At 100%, a 4.7-second FLOW RUSH activates: faster/larger petal strikes and a light movement boost. Taking damage drains the gauge; standing idle does not charge it.
- Five-world original adaptive WebAudio score now layers chord pads, bell countermelodies, bass fills and percussion as crowd density, kill combo, boss pressure and Flow Rush increase. Different melodic timbres and patterns per world; soundtrack continues its phrase after pauses and upgrade choices.
- Original FLOW RUSH arrival cue, luminous aura and charging UI are built into the gameplay. Audio is generated in browser and licensed as original code (no third-party tracks).

## V3 FRONTLINE RUSH — forward swarm action (2026-11-10)
- A frontal tsunami of independently animated colorful glimmer enemies advances from the top/front of the screen continuously; normal tougher jelly/rush/tank/spitter/boss enemies remain as tactical threats.
- Additional automatic forward-facing PRISM SWEEP scythes cut through dense rows while the original orbiting petal blades and player-triggered PRISM BURST continue. A moving player unlocks the temporary FLOW RUSH attack-speed/radius boost.
- The lightweight micro-enemy pool limits active entities by viewport and uses simplified original rounded jelly artwork. Actual score counts individual cleared enemies; there is no misleading multiplier or fictitious kills. Total attackers may reach tens of thousands per stage, depending on playtime; total defeated depends on player performance.
- Every 1,000 forward-swarm kills triggers an additional visible celebration. Music layers and percussion respond to the crowd, stage progress, FLOW RUSH and boss state; grouped horde SFX avoid per-enemy audio overload.
