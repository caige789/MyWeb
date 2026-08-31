# Task 4: Aircraft Stage/Boss System

## What was done
Rewrote `/home/z/my-project/src/components/games/AircraftGame.tsx` to add a full stage/level progression system with 5 distinct boss types.

## Key changes
1. **10-stage system**: Each stage requires 20 enemy kills, then a mandatory boss fight
2. **5 boss types**:
   - Type 1 (Stages 1-2): Basic 3-way spread shot
   - Type 2 (Stages 3-4): Rapid 5-way spread + aimed homing shots
   - Type 3 (Stages 5-6): Shield boss with regenerating shield + spiral bullet pattern
   - Type 4 (Stages 7-8): Summoner that spawns minions + aimed shots
   - Type 5 (Stages 9-10): Ultimate boss combining all patterns, enrages at 50% HP
3. **Warning system**: Flashing red "WARNING" border at 18/20 kills before boss
4. **Stage transitions**: 3-second "STAGE X CLEAR!" with score bonus (stage * 100)
5. **Victory state**: "ALL STAGES CLEAR!" after beating stage 10 boss
6. **Enemy scaling by stage**: Speed and spawn frequency increase, more tanks at stage 4+
7. **Enemy shoot-back**: Stage 7+ enemies fire aimed shots at player (10% chance per 2 sec)
8. **HUD updates**: Stage number, kill counter (ENEMIES: X/20), boss type name display
9. **Shield boss**: Blue shield bar rendered, damage shield before HP, shield regens after 5s

## Notes
- All Chinese text uses unicode escapes or string literals only (no Chinese in comments)
- Lint passes clean with 0 errors
- All existing mechanics preserved (weapon upgrades, powerups, particles, touch/mouse, resize)
- Boss interface expanded with: shieldHp, shieldMaxHp, shieldRegenTimer, summonTimer, specialTimer, spiralAngle, enraged, aimedShotTimer, shotCount, bossType
