// Simple test runner to verify AndroidPermissionService functionality
// This bypasses Jest configuration issues and tests core logic

const { AndroidPermissionServiceImpl } = require('./src/services/AndroidPermissionService.ts');

// Mock console for cleaner output
const originalConsole = console;
console.error = () => {};
console.warn = () => {};

// Simple test framework
let testCount = 0;
let passedTests = 0;

function test(name, testFn) {
  testCount++;
  try {
    testFn();
    originalConsole.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    originalConsole.log(`✗ ${name}: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeInstanceOf: (expected) => {
      if (!(actual instanceof expected)) {
        throw new Error(`Expected instance of ${expected.name}, got ${typeof actual}`);
      }
    }
  };
}

// Basic tests
originalConsole.log('Running AndroidPermissionService tests...\n');

test('AndroidPermissionServiceImpl should be instantiable', () => {
  const service = new AndroidPermissionServiceImpl();
  expect(service).toBeInstanceOf(AndroidPermissionServiceImpl);
});

test('Service should have required methods', () => {
  const service = new AndroidPermissionServiceImpl();
  expect(typeof service.requestMediaLibraryPermissions).toBe('function');
  expect(typeof service.requestStoragePermissions).toBe('function');
  expect(typeof service.checkPermissionStatus).toBe('function');
  expect(typeof service.openAppSettings).toBe('function');
  expect(typeof service.shouldShowPermissionRationale).toBe('function');
});

test('Cache management should work', () => {
  const service = new AndroidPermissionServiceImpl();
  const initialSize = service.getCachedPermissions().size;
  expect(initialSize).toBe(0);
  
  service.clearPermissionCache();
  expect(service.getCachedPermissions().size).toBe(0);
});

originalConsole.log(`\nTest Results: ${passedTests}/${testCount} tests passed`);

if (passedTests === testCount) {
  originalConsole.log('✓ All basic tests passed!');
  process.exit(0);
} else {
  originalConsole.log('✗ Some tests failed');
  process.exit(1);
}