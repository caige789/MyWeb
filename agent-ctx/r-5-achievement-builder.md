# Task r-5: Achievement System for Digital Garden

## Summary
Built a complete achievement system for the digital garden project.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `Achievement` model (id, code, name, description, icon, users relation)
- Added `UserAchievement` model (id, userId, achievementId, unlockedAt, user/achievement relations)
- Added `achievements UserAchievement[]` to `User` model
- Ran `prisma db push --force-reset` successfully

### 2. Seed Script (`scripts/init-achievements.ts`)
- Inserts 8 achievements via upsert (idempotent)
- Achievements: first_game, game_collector, high_scorer, perfect_score, streak_3, streak_7, blog_author, explorer
- Executed successfully

### 3. API Route (`src/app/api/achievements/route.ts`)
- **GET**: Returns all achievements with `unlocked` boolean and `unlockedAt` date for authenticated users; returns `total` and `unlocked` counts
- **POST**: Admin-only endpoint to unlock an achievement for a user by userId + code

### 4. UI Component (`src/components/AchievementPanel.tsx`)
- Modal overlay with 2x4 grid (grid-cols-2 sm:grid-cols-4)
- Unlocked cards: colored icon, name, description, unlock date, amber gradient border
- Locked cards: grayscale, opacity-50, name shows '???', lock SVG overlay
- Progress bar at top showing X/8 unlock progress
- Loading skeleton state
- Close button with 44px touch target
- Responsive design

### 5. HomePage Integration (`src/components/home/HomePage.tsx`)
- Added `AchievementPanel` import and `achOpen` state
- Added 'Achievement' (Trophy icon) card to stats grid (now 6 columns on md+)
- Grid updated: grid-cols-2 sm:grid-cols-3 md:grid-cols-6
- Clicking the achievement card opens the panel
- Achievement card has amber hover border highlight

## Verification
- `npx tsc --noEmit`: Zero errors in `src/` (only pre-existing errors in examples/ and skills/)
- `bun run lint`: Zero errors
