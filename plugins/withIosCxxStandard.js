const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIosCxxStandard(config) {
  // 1. Modify the main Xcode Project target
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        configurations[key].buildSettings['CLANG_CXX_LANGUAGE_STANDARD'] = '"gnu++20"';
      }
    }
    console.log('[withIosCxxStandard] Successfully configured C++20 build settings in Xcode Project.');
    return config;
  });

  // 2. Modify the Podfile for Pods targets
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        console.warn(`[withIosCxxStandard] Podfile not found at: ${podfilePath}`);
        return config;
      }

      let content = fs.readFileSync(podfilePath, 'utf-8');

      const injectionMarker = '# INJECTED BY CONFIG PLUGIN: withIosCxxStandard';
      if (content.includes(injectionMarker)) {
        console.log('[withIosCxxStandard] C++20 build settings already injected into Podfile.');
        return config;
      }

      // Match 'post_install do |installer|' with flexibility for spacing
      const searchRegex = /post_install do\s*\|\s*installer\s*\|/;
      if (!searchRegex.test(content)) {
        console.warn('[withIosCxxStandard] Could not find "post_install do |installer|" block in Podfile.');
        return config;
      }

      const injection = `post_install do |installer|
  ${injectionMarker}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'
    end
  end`;

      content = content.replace(searchRegex, injection);
      fs.writeFileSync(podfilePath, content, 'utf-8');
      console.log('[withIosCxxStandard] Successfully injected C++20 build settings into Podfile.');

      return config;
    },
  ]);
}

module.exports = withIosCxxStandard;
