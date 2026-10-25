#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const release = process.argv[2] === 'release';
const task = release ? 'assembleRelease' : 'assembleDebug';
const javaCommand = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const java = spawnSync(javaCommand, ['-version'], { encoding: 'utf8' });
const versionText = (java.stderr || '') + (java.stdout || '');
const major = Number(versionText.match(/version "(?:1\.)?(\d+)/)?.[1]);
if (java.error || !major || major !== 17) {
  console.error("This Gradle/Capacitor 6 project requires JDK 17, not the newer JDK bundled with recent Android Studio versions. Set JAVA_HOME/PATH or select Gradle JDK 17 in Android Studio. See BUILD-APK.md.");
  process.exit(1);
}
if (release && !fs.existsSync(path.join(android, 'keystore.properties'))) {
  console.error('Release signing is not configured. Use Android Studio > Generate Signed Bundle / APK, or create android/keystore.properties following BUILD-APK.md. Never share your keystore or passwords.');
  process.exit(1);
}
const windows = process.platform === 'win32';
const wrapper = windows ? 'gradlew.bat' : './gradlew';
if (!windows) fs.chmodSync(path.join(android, 'gradlew'), 0o755);
const result = spawnSync(wrapper, [task, '--console=plain', '--no-daemon', '--max-workers=1'], { cwd: android, stdio: 'inherit', shell: windows });
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
const output = path.join(android, 'app', 'build', 'outputs', 'apk', release ? 'release' : 'debug');
console.log(`\nAPK output: ${output}\n${release ? 'Share the SIGNED release APK as a document via WhatsApp, email, or a trusted download link.' : 'Debug APK is for testing. Use a signed release APK when distributing updates to users.'}`);
