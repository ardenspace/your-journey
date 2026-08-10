/**
 * Local config plugin: fully opt out of Android backup & device-to-device transfer.
 *
 * Spec B1 (개인 데이터 보호): 일기 데이터는 기기를 떠나지 않는다.
 * - `expo.android.allowBackup: false` (app.json) covers Auto Backup on pre-12.
 * - Android 12+ additionally consults `android:dataExtractionRules` for both
 *   cloud backup AND device-to-device transfer — expo's config schema has no
 *   field for it, so this plugin writes the XML resource at prebuild time and
 *   points the manifest <application> tag at it.
 */
const path = require('path');
const fs = require('fs');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="root" path="."/>
    <exclude domain="file" path="."/>
    <exclude domain="database" path="."/>
    <exclude domain="sharedpref" path="."/>
    <exclude domain="external" path="."/>
  </cloud-backup>
  <device-transfer>
    <exclude domain="root" path="."/>
    <exclude domain="file" path="."/>
    <exclude domain="database" path="."/>
    <exclude domain="sharedpref" path="."/>
    <exclude domain="external" path="."/>
  </device-transfer>
</data-extraction-rules>
`;

/** Write res/xml/data_extraction_rules.xml into the generated android project. */
function withDataExtractionRulesResource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'data_extraction_rules.xml'),
        DATA_EXTRACTION_RULES_XML
      );
      return config;
    },
  ]);
}

/** Point the manifest <application> at the rules and disable legacy full backup. */
function withNoDataExtractionManifest(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = 'false';
    application.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    return config;
  });
}

module.exports = function withNoDataExtraction(config) {
  config = withDataExtractionRulesResource(config);
  config = withNoDataExtractionManifest(config);
  return config;
};
