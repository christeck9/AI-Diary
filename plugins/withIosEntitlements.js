const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * withIosEntitlements - Config plugin to add iOS entitlements for large model support
 * 
 * Extended Virtual Addressing: Allows processes to use more than 1.5GB of memory
 * Increased Memory Limit: Prevents iOS from killing the app when combined Whisper+Gemma load exceeds memory limits
 * 
 * These are required for running large LLMs (Gemma 4B+) and Whisper on iOS devices.
 */
function withIosEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    
    // Extended Virtual Addressing - allows >1.5GB memory usage
    entitlements['com.apple.developer.kernel.extended-virtual-addressing'] = true;
    
    // Increased Memory Limit - prevents app termination under memory pressure
    entitlements['com.apple.developer.kernel.increased-memory-limit'] = true;
    
    console.log('[withIosEntitlements] Added Extended Virtual Addressing and Increased Memory Limit entitlements.');
    
    return config;
  });
}

module.exports = withIosEntitlements;