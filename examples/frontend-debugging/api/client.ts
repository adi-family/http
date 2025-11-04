/**
 * API Client Setup
 * Switches between mock and real client based on environment
 */

import { BaseClient } from '@adi-family/http';
import { setupMockClient } from './dev-mocks';

// Check if we're in development and should use mocks
const isDevelopment = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1');

const useMocks =
  isDevelopment &&
  (typeof localStorage !== 'undefined'
    ? localStorage.getItem('useMocks') !== 'false' // Default to mocks in dev
    : true);

// Get the current scenario for testing different states
const scenario =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('mockScenario') || 'default'
    : 'default';

// Create the appropriate client
export const apiClient = useMocks
  ? setupMockClient(scenario)
  : new BaseClient({
      baseUrl: import.meta?.env?.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

// Helper to check if we're using mocks
export const isUsingMocks = useMocks;

// Helper to get current scenario
export const getCurrentScenario = () => scenario;

/**
 * Development utilities
 * Available in browser console
 */
if (typeof window !== 'undefined' && isDevelopment) {
  (window as any).__apiDebug = {
    // Toggle mocks
    enableMocks: () => {
      localStorage.setItem('useMocks', 'true');
      console.log('✅ Mocks enabled. Refresh the page.');
    },
    disableMocks: () => {
      localStorage.setItem('useMocks', 'false');
      console.log('❌ Mocks disabled. Refresh the page.');
    },

    // Set scenario
    setScenario: (scenario: string) => {
      localStorage.setItem('mockScenario', scenario);
      console.log(`📋 Scenario set to: ${scenario}. Refresh the page.`);
      console.log('Available scenarios: default, empty, error, large, edge, slow');
    },

    // Show current state
    status: () => {
      console.log('API Client Status:');
      console.log('- Using mocks:', useMocks);
      console.log('- Scenario:', scenario);
      console.log('\nCommands:');
      console.log('- __apiDebug.enableMocks()');
      console.log('- __apiDebug.disableMocks()');
      console.log('- __apiDebug.setScenario("empty")');
    },
  };

  console.log('🔧 API Debug tools available: __apiDebug.status()');
}
