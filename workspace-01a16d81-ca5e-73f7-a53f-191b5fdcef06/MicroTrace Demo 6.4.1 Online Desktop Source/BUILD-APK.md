# Build MicroTrace Demo in Android Studio Rabbit 1 / 2026.2.1

## Ready-to-install APK

If you received the compiled **MicroTrace Demo 6.4.1.apk**, you do **not** need Node.js or Android Studio. Download it from the provided HTTPS page, open it on Android and install only if you trust the file/source. It is a debug-signed demonstration APK, not a Play Store release.

- App name: **MicroTrace Demo**
- Package: `com.microtrace.lab.microtracedemo` (separate from earlier MicroTrace packages)
- Version: `6.4.1` / version code `11`
- Minimum Android: 5.1 (API 22); target/compile SDK: 34

## Open the supplied source ZIP

1. Extract the complete source ZIP to a short writable path, such as `C:\Projects\MicroTrace-Demo`. Do not open a subfolder that does not contain `package.json`.
2. Install **Node.js 22.12+** (or 20.19+) and Android Studio **Rabbit 1 / 2026.2.1**.
3. In Android Studio SDK Manager, install **Android SDK Platform 34**, **Build-Tools 34.0.0**, Platform-Tools and Android SDK Command-line Tools. Accept licenses.
4. Set Android Studio **Gradle JDK** to **JDK 17**. This project pins Android Gradle Plugin 8.2.1 and Gradle 8.2.1; JDK 17 is the tested choice.
5. From the extracted project root:

```powershell
npm ci
npm run build
npx cap sync android
npx cap open android
```

Android Studio opens the `android` folder. Wait for its Gradle sync, select the `app` configuration, then use **Run** or **Build → Build APK(s)**.

The root-safe shortcut on Windows is:

```powershell
.\BUILD-WINDOWS.ps1 -OpenAndroid
```

It switches into its own directory before invoking npm. Use `-SkipInstall` only after dependencies have already been installed successfully.

## Command-line debug APK

With JDK 17 and `ANDROID_HOME`/`ANDROID_SDK_ROOT` pointing to your SDK:

```powershell
npm run android:debug
```

Output:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

The source limits Gradle to one worker and a 1024 MB heap for low-memory machines. Android Studio may use its own Gradle settings, but should open the same pinned project without changing AGP or Gradle.

## Signing and updates

The ready-to-use release artifact is debug-signed. For a private, repeatable release signature, use Android Studio **Build → Generate Signed Bundle / APK → APK**, create a private keystore and keep it safe. Never put a keystore or its passwords in this source ZIP.

An APK built with a different key cannot update an installed package with the same ID. Do not uninstall a working app blindly: offline records live on that device and can be lost. Keep the same signing key for updates, or plan a migration/export first.

## Offline scope

The APK bundles the original sample data and local Registers controls. No Supabase project, Gmail credentials, API key, cloud account, live email service or device server is required. It is intentionally local to each installation. See `VERIFICATION-AND-LIMITS.md` for exactly what the demo does and does not prove.
