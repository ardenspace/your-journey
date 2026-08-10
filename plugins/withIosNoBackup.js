/**
 * Local config plugin: exclude the SQLite diary data from iCloud/device backups on iOS.
 *
 * Spec B1 (개인 데이터 보호, iOS): 일기 데이터는 Apple 클라우드로도 나가지 않는다.
 *
 * Mechanism (and why): expo-file-system 57 / expo-sqlite 57 expose no JS API for
 * NSURLIsExcludedFromBackupKey, so this plugin injects Swift into the generated
 * AppDelegate's `application(_:didFinishLaunchingWithOptions:)` — before React
 * Native (and therefore any JS/expo-sqlite code) starts. The snippet creates
 * `<Documents>/SQLite` (the directory expo-sqlite stores databases in, see
 * expo-sqlite/ios/SQLiteModule.swift `defaultDatabaseDirectory`) and sets
 * `URLResourceValues.isExcludedFromBackup = true` (== NSURLIsExcludedFromBackupKey)
 * on it, which excludes the directory and everything inside it from iCloud and
 * iTunes/Finder device backups. Runs on every launch, so the flag holds even if
 * the OS or a restore ever recreates the directory.
 *
 * Failure policy: runtime failures are silent (`try?`) — privacy degradation must
 * not block launch. Build-time failures are loud: `mergeContents` throws
 * ERR_NO_MATCH if the AppDelegate template no longer matches the anchor, and the
 * plugin throws if the template is not Swift.
 *
 * Verification (both automated):
 * - plugins/__tests__/withIosNoBackup.test.ts unit-tests the merge against the
 *   real SDK 57 AppDelegate template shape (injection point, idempotency,
 *   loud failure on unknown template).
 * - `npx expo prebuild --no-install --platform ios` then inspect
 *   ios/app/AppDelegate.swift for the `@generated begin your-journey-ios-no-backup`
 *   block (do not commit the generated ios/ directory).
 */
const { withAppDelegate } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'your-journey-ios-no-backup';

const SWIFT_SNIPPET = `    // Spec B1: diary data never leaves the device — exclude expo-sqlite's
    // database directory from iCloud/device backups. Silent on failure.
    if var sqliteDirectory = FileManager.default
      .urls(for: .documentDirectory, in: .userDomainMask).first?
      .appendingPathComponent("SQLite", isDirectory: true) {
      try? FileManager.default.createDirectory(
        at: sqliteDirectory, withIntermediateDirectories: true)
      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      try? sqliteDirectory.setResourceValues(resourceValues)
    }`;

/**
 * Pure merge step (exported for unit tests). Inserts the backup-exclusion
 * Swift snippet at the top of `application(_:didFinishLaunchingWithOptions:)`.
 * Throws ERR_NO_MATCH if the anchor is missing. Idempotent (tagged block).
 */
function addNoBackupToAppDelegate(contents) {
  return mergeContents({
    src: contents,
    newSrc: SWIFT_SNIPPET,
    anchor: /didFinishLaunchingWithOptions launchOptions/,
    // anchor line + 1 is `) -> Bool {` (multiline signature) — insert after it.
    offset: 2,
    tag: TAG,
    comment: '//',
  }).contents;
}

module.exports = function withIosNoBackup(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        `withIosNoBackup: expected a Swift AppDelegate, got "${config.modResults.language}". ` +
          'Update plugins/withIosNoBackup.js for the new template.'
      );
    }
    config.modResults.contents = addNoBackupToAppDelegate(config.modResults.contents);
    return config;
  });
};
module.exports.addNoBackupToAppDelegate = addNoBackupToAppDelegate;
module.exports.TAG = TAG;
