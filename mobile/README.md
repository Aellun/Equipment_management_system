# Equipment Tracker — Android (offline, single-user)

A standalone Android app for tracking event equipment. **Fully offline** — all data
lives in a local SQLite database on the phone. It does **not** connect to the web
app's backend and does not share data with it.

## Features
- Dashboard: available / out / maintenance / overdue counts
- Equipment: add, edit, delete; status badges; "mark fixed" from Maintenance
- Clients (borrowers): add, edit, delete
- Categories: add, delete
- Check out: Available → Out (atomic, blocks if not available)
- Check in: quality-control form; Out → Available, or → Maintenance if Damaged / Needs Repair
- Activity log: full transaction history with overdue flagging

## State machine (mirrors the web backend)
- `Available` → `Out` (only via checkout)
- `Out` → `Available` (returned in Good condition)
- `Out` → `Maintenance` (returned Damaged or Needs Repair)
- `Maintenance` → `Available` (manual "mark fixed")

## Develop
```bash
cd mobile
npm install
npm start        # Expo dev server; open in Expo Go or an emulator
```

## Build a release APK locally
Requires JDK 17 + Android SDK. Set these env vars first:
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$PATH
```
Then build:
```bash
cd mobile
npx expo prebuild --platform android   # generates native android/ project
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleRelease               # outputs app/build/outputs/apk/release/app-release.apk
```
Install on a device with `adb install app-release.apk` or by copying the file.

The built APK is also kept at `mobile/EquipmentTracker.apk`.

### Note on Expo package versions
All Expo packages must stay on the SDK 51 line. `npm install` can pull a
mismatched transitive `expo-font` — if a Gradle build fails with
`Plugin [id: 'expo-module-gradle-plugin'] was not found`, run
`npx expo install expo-font expo-asset` to re-pin them, then re-prebuild.

## Tech
Expo (React Native) · Expo Router · expo-sqlite · TypeScript.
