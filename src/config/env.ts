/**
 * Environment configuration for RackSmith
 * Handles dev vs prod mode switching
 */

import packageJson from '../../package.json';

export const config = {
  // Release mode: 'dev' or 'prod'
  release: import.meta.env.RELEASE || 'dev',
  
  // API base URL
  apiUrl: import.meta.env.API_URL || 'http://localhost:3000/api',
  
  // App version (auto-imported from package.json)
  version: packageJson.version,
  
  // Helper functions
  isDev: () => config.release === 'dev',
  isProd: () => config.release === 'prod',
  
  // Auth bypass for development
  shouldBypassAuth: () => config.isDev(),
} as const;

/**
 * Log configuration on startup
 */
if (config.isDev()) {
  console.log('🔧 RackSmith running in DEVELOPMENT mode');
  console.log('   - Authentication: BYPASSED');
  console.log('   - Data Source: Mock/LocalStorage');
  console.log('   - API URL:', config.apiUrl);
  console.log('   - Version:', config.version);
} else {
  console.log('🚀 RackSmith running in PRODUCTION mode');
  console.log('   - Authentication: ENFORCED');
  console.log('   - Data Source: API');
  console.log('   - API URL:', config.apiUrl);
  console.log('   - Version:', config.version);
}

export default config;
