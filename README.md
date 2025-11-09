# APP Task Manager #

Production-ready Expo (React Native) application for managing team tasks with secure Supabase auth, offline-first state, and cross-platform polish.

## Feature Overview

- **Authentication** – Email/password sign up & sign in via Supabase Auth with role-aware (admin/member) access control and secure token storage.
- **Task Dashboard** – Filterable, searchable list with date sorting, offline indicator, optimistic updates, and admin-only quick create FAB.
- **Task Detail** – Role-gated editing (admins) and status transitions (all members) with delete confirmation and inline validation.
- **Offline Sync** – NetInfo-driven queue that stores optimistic mutations locally, replays them when connectivity returns, and reconciles from Supabase.
- **Local & Remote Storage** – AsyncStorage cache for signed-in user tasks plus Supabase `tasks` table for realtime consistency.
- **Notifications** – Local reminder scheduling plus push token registration flow using `expo-notifications` & `expo-device`.
- **Diagnostics** – Settings screen surfaces network state, queue depth, last sync timestamp, and manual sync controls.
- **Testing** – Jest unit coverage for task reducers & sync queue behaviour.

## Screenshots

Add simulator captures or a short Loom link here (optional).

## Tech Stack

- **Runtime**: Expo SDK 54 (React Native 0.81) via Expo Router
- **Auth & Data**: Supabase Auth + Postgres (`profiles`, `tasks` tables)
- **State Management**: Redux Toolkit with typed hooks
- **Storage**: Expo SecureStore (session), AsyncStorage (task cache)
- **Networking & Offline**: `@react-native-community/netinfo`, optimistic queue, Supabase sync
- **Notifications**: `expo-notifications`, `expo-device`
- **Testing**: Jest + React Native Testing Library stack

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Update `app.json` or `.env` with Supabase credentials:

   ```json
   "extra": {
     "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
     "supabaseAnonKey": "YOUR_PUBLIC_ANON_KEY"
   }
   ```

3. **Provision Supabase schema**

   ```sql
   create table profiles (
     id uuid primary key references auth.users on delete cascade,
     email text unique not null,
     role text not null check (role in ('admin','member')),
     full_name text,
     avatar_url text,
     inserted_at timestamptz default now()
   );

   create table tasks (
     id uuid primary key,
     title text not null,
     description text,
     assigned_to text not null,
     assigned_date timestamptz not null,
     due_date timestamptz,
     completed boolean default false,
     status text not null check (status in ('not_started','in_progress','completed')),
     created_by uuid references profiles(id),
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   alter table tasks enable row level security;
   create policy "task access" on tasks for select using (auth.uid() is not null);
   create policy "task write" on tasks for all using (auth.uid() is not null);
   ```

4. **Run the app**

   ```bash
   npx expo start
   ```

   Use `i`/`a` to launch iOS Simulator or Android Emulator. Development builds are recommended for push notification testing.

5. **Execute tests**

   ```bash
   npm test
   ```

## State Management

- Global store located in `src/store` (Redux Toolkit).
- Feature slices: `authSlice` (session/profile), `tasksSlice` (entities, filters, offline queue), `networkSlice` (NetInfo snapshot).
- Typed hooks (`useAppDispatch`, `useAppSelector`) ensure type safety across screens.

## Offline Strategy

- `NetInfo` watcher updates Redux on connectivity changes.
- Optimistic CRUD operations enqueue a structured mutation when offline.
- Queue drains via `syncOfflineQueue` thunk (last-write-wins) and triggers a post-sync refresh.
- Latest task set cached in AsyncStorage for cold starts and offline reads.

## Notifications

- `registerNotificationChannel()` requests permissions, configures Android channel.
- `scheduleTaskReminder()` demonstrates local notification scheduling.
- Settings screen exposes push token registration hook; integrate with server to deliver remote pushes.

## Documented AI Usage

- Used ChatGPT (GPT-5 Codex) collaboratively to scaffold Redux slices, Supabase client wiring, offline queue, notification helper, and initial test cases.

## Publishing Guidance

### Google Play Store

1. Generate Android build: `npx expo run:android --variant release` or `eas build -p android`.
2. Sign the AAB (configure `android/app/build.gradle` or use EAS credentials manager).
3. Upload to Google Play Console → Create new release, attach AAB, provide screenshots & content rating.
4. Set up FCM server key if delivering pushes in production.

### Apple App Store

1. Ensure Apple Developer membership, register bundle identifier in App Store Connect.
2. Create development & distribution certificates (EAS credentials manager recommended).
3. Build archive: `eas build -p ios` (requires paid account) or Xcode archive from `ios` workspace.
4. Upload via Transporter/Xcode Organizer, complete App Store Connect metadata, submit for review.

## Known Issues / Future Enhancements

- Supabase table policies currently permissive; tighten for role-based ownership before production.
- Push notifications downstream service not implemented—only local alerts & token capture are in place.
- Due date picker uses manual `YYYY-MM-DD` input; replace with platform date picker for better UX.
- Add integration tests covering navigation flows and optimistic rollback scenarios.

## Directory Highlights

- `app/(auth)` – Auth stack (login, signup)
- `app/(app)` – Protected screens: dashboard, task modals, settings
- `src/store` – Redux Toolkit slices, sync thunks
- `src/services` – Supabase client, notification helpers
- `__tests__` – Jest suites for reducers & sync queue

Happy shipping! 🎉
