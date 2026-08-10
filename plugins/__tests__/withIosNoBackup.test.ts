/**
 * B1 (iOS): verifies the config plugin injects the NSURLIsExcludedFromBackupKey
 * (URLResourceValues.isExcludedFromBackup) snippet into the SDK 57 Swift
 * AppDelegate template. Complements manual prebuild inspection — see the
 * header comment in plugins/withIosNoBackup.js.
 */
const {
  addNoBackupToAppDelegate,
  TAG,
} = require("../withIosNoBackup") as {
  addNoBackupToAppDelegate: (contents: string) => string;
  TAG: string;
};

/** Trimmed copy of the AppDelegate.swift that `expo prebuild` (SDK 57) generates. */
const TEMPLATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
  }
}
`;

describe("withIosNoBackup: addNoBackupToAppDelegate", () => {
  it("marks expo-sqlite's SQLite directory as excluded from backup", () => {
    const merged = addNoBackupToAppDelegate(TEMPLATE);

    expect(merged).toContain('appendingPathComponent("SQLite", isDirectory: true)');
    expect(merged).toContain("resourceValues.isExcludedFromBackup = true");
    expect(merged).toContain("setResourceValues(resourceValues)");
    expect(merged).toContain(`@generated begin ${TAG}`);
    expect(merged).toContain(`@generated end ${TAG}`);
  });

  it("injects at the top of didFinishLaunchingWithOptions, before React Native starts", () => {
    const merged = addNoBackupToAppDelegate(TEMPLATE);

    const bodyStart = merged.indexOf(") -> Bool {");
    const injected = merged.indexOf("isExcludedFromBackup = true");
    const reactStart = merged.indexOf("let delegate = ReactNativeDelegate()");
    expect(bodyStart).toBeGreaterThan(-1);
    expect(injected).toBeGreaterThan(bodyStart);
    expect(reactStart).toBeGreaterThan(injected);
  });

  it("is idempotent across repeated prebuilds", () => {
    const once = addNoBackupToAppDelegate(TEMPLATE);
    const twice = addNoBackupToAppDelegate(once);

    expect(twice).toBe(once);
    expect(twice.match(/isExcludedFromBackup = true/g)).toHaveLength(1);
  });

  it("fails loudly at build time if the AppDelegate template changes shape", () => {
    expect(() =>
      addNoBackupToAppDelegate("class AppDelegate {}\n")
    ).toThrow(/Failed to match/);
  });
});
