# Flux Mobile CLI - Test Suite

This directory contains the test suite for the Flux Mobile CLI tool.

## Test Structure

```
tests/
├── commands/           # Unit tests for CLI commands
│   └── init.test.js   # Tests for init command
├── utils/             # Unit tests for utility functions
│   ├── config.test.js
│   ├── ipa-parser.test.js
│   └── appstore-api.test.js
├── validation/        # Input validation tests
│   └── input-validation.test.js
├── integration/       # Integration tests (end-to-end workflows)
│   └── build-workflow.test.js
└── README.md         # This file
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Run specific test file

```bash
npm test -- tests/utils/ipa-parser.test.js
```

### Run tests matching a pattern

```bash
npm test -- --testNamePattern="formatReleaseNotes"
```

## Test Categories

### 1. Unit Tests (`tests/utils/` and `tests/commands/`)

- Test individual functions and modules in isolation
- Mock external dependencies (file system, API calls, etc.)
- Fast execution, run on every commit

### 2. Validation Tests (`tests/validation/`)

- Test input validation logic
- Ensure proper error handling for invalid inputs
- Test edge cases and boundary conditions

### 3. Integration Tests (`tests/integration/`)

- Test complete workflows (build → deploy)
- Require actual tools (Flutter, Xcode, etc.)
- May be skipped in CI if dependencies are unavailable
- Marked with `.skip` for optional execution

## Writing Tests

### Example Unit Test

```javascript
import { describe, test, expect } from "@jest/globals";
import { myFunction } from "../../utils/my-module.js";

describe("My Module", () => {
  test("should do something correctly", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });
});
```

### Example Integration Test

```javascript
import { describe, test, expect } from "@jest/globals";
import { execSync } from "child_process";

describe("Build Integration", () => {
  test("should build APK successfully", async () => {
    // Setup test project
    // Run flux build command
    // Verify output artifact exists
  });
});
```

## Mocking

For tests that interact with external APIs or file system:

```javascript
import { jest } from "@jest/globals";
import fs from "fs-extra";

// Mock fs module
jest.mock("fs-extra");

test("should handle file operations", async () => {
  fs.readFile.mockResolvedValue("mocked content");
  // ... test code
});
```

## Code Coverage

Aim for:

- **80%+ coverage** for core utilities (`utils/`)
- **70%+ coverage** for commands (`commands/`)
- **100% coverage** for validation logic

View coverage report:

```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on:

- Every commit (unit tests only)
- Pull requests (unit + validation tests)
- Release branches (full test suite including integration tests)

## Troubleshooting

### Tests failing due to missing dependencies

Some integration tests require:

- Flutter SDK
- Xcode (macOS only)
- Android SDK

These tests are marked with `.skip` and won't fail CI.

### Permission errors

Ensure test directories are cleaned up:

```bash
rm -rf .test-* coverage
```

### Module import errors

Ensure you're using ES modules syntax:

```javascript
import { test } from "@jest/globals"; // ✅ Correct
const { test } = require("@jest/globals"); // ❌ Wrong
```

## Future Improvements

- [ ] Add E2E tests with real Flutter/RN projects
- [ ] Add API mocking for App Store Connect and Google Play APIs
- [ ] Add performance benchmarks
- [ ] Add snapshot testing for CLI output
- [ ] Add mutation testing for critical paths
