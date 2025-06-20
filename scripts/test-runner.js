#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logHeader = (message) => {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
  console.log(`${colors.bold}${colors.cyan}${message.toUpperCase()}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
};

const logSection = (message) => {
  console.log(`\n${colors.bold}${colors.blue}${'-'.repeat(40)}`);
  console.log(`${colors.bold}${colors.blue}${message}`);
  console.log(`${colors.blue}${'-'.repeat(40)}${colors.reset}\n`);
};

const runCommand = (command, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`, 'yellow');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};

const checkTestFiles = () => {
  const testDir = path.join(__dirname, '..', 'test');
  const testFiles = [
    'fixtures/testData.js',
    'validation.test.js',
    'errorHandling.test.js',
    'translationServices.test.js',
    'apiIntegration.test.js'
  ];

  log('Checking test files...', 'blue');
  
  const missingFiles = testFiles.filter(file => {
    const filePath = path.join(testDir, file);
    return !fs.existsSync(filePath);
  });

  if (missingFiles.length > 0) {
    log('Missing test files:', 'red');
    missingFiles.forEach(file => log(`  - ${file}`, 'red'));
    return false;
  }

  log('✓ All test files present', 'green');
  return true;
};

const setTestEnvironment = () => {
  log('Setting up test environment...', 'blue');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-key-sk-1234567890';
  process.env.DEFAULT_TRANSLATOR = 'openai';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/ultimate_translator_test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  process.env.PORT = '0'; // Use random port for testing
  
  log('✓ Test environment configured', 'green');
};

const runTestSuite = async (testFile, description) => {
  logSection(`${description}`);
  
  try {
    await runCommand('npx', ['mocha', `test/${testFile}`, '--timeout', '10000']);
    log(`✓ ${description} - PASSED`, 'green');
    return { name: description, status: 'PASSED' };
  } catch (error) {
    log(`✗ ${description} - FAILED`, 'red');
    return { name: description, status: 'FAILED', error: error.message };
  }
};

const generateTestReport = (results) => {
  logHeader('Test Summary Report');
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const total = results.length;
  
  log(`Total Tests: ${total}`, 'white');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'green' : 'yellow');
  
  if (failed > 0) {
    log('\nFailed Tests:', 'red');
    results.filter(r => r.status === 'FAILED').forEach(result => {
      log(`  ✗ ${result.name}`, 'red');
      if (result.error) {
        log(`    Error: ${result.error}`, 'red');
      }
    });
  }
  
  console.log('\n');
  return failed === 0;
};

const main = async () => {
  try {
    logHeader('Ultimate Translator Test Suite');
    
    // Check prerequisites
    if (!checkTestFiles()) {
      log('❌ Test setup incomplete. Please run the full test setup first.', 'red');
      process.exit(1);
    }
    
    setTestEnvironment();
    
    // Run test suites in order
    const testSuites = [
      { file: 'validation.test.js', description: 'Validation System Tests' },
      { file: 'errorHandling.test.js', description: 'Error Handling Tests' },
      { file: 'translationServices.test.js', description: 'Translation Services Tests' },
      { file: 'apiIntegration.test.js', description: 'API Integration Tests' }
    ];
    
    const results = [];
    
    for (const suite of testSuites) {
      const result = await runTestSuite(suite.file, suite.description);
      results.push(result);
    }
    
    // Generate final report
    const allPassed = generateTestReport(results);
    
    if (allPassed) {
      log('🎉 All tests passed! The Ultimate Translator is ready for deployment.', 'green');
      process.exit(0);
    } else {
      log('⚠️  Some tests failed. Please review and fix the issues before deployment.', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.bold}${colors.cyan}Ultimate Translator Test Runner${colors.reset}

Usage: node scripts/test-runner.js [options]

Options:
  --help, -h     Show this help message
  --watch, -w    Run tests in watch mode
  --coverage, -c Run tests with coverage report

Environment Variables:
  NODE_ENV       Set to 'test' automatically
  LOG_LEVEL      Set to 'error' to reduce noise
  
Examples:
  node scripts/test-runner.js              # Run all tests
  npm run test                             # Same as above
  npm run test:watch                       # Run in watch mode
`);
  process.exit(0);
}

if (args.includes('--watch') || args.includes('-w')) {
  log('Running tests in watch mode...', 'yellow');
  runCommand('npx', ['mocha', 'test/**/*.test.js', '--watch', '--timeout', '10000'])
    .catch(() => process.exit(1));
} else if (args.includes('--coverage') || args.includes('-c')) {
  log('Running tests with coverage...', 'yellow');
  runCommand('npx', ['nyc', 'mocha', 'test/**/*.test.js', '--timeout', '10000'])
    .catch(() => process.exit(1));
} else {
  main();
} 