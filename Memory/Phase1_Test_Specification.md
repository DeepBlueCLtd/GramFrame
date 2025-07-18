# Test Specification: GramFrame Phase 1

## Overview

This document outlines the test specifications for Phase 1 of the GramFrame component implementation, focusing on the bootstrapping and development harness tasks.

## Test Scope

- Task 1.1: Create `debug.html` page that loads a fixed component instance manually
- Task 1.2: Set up CSS styling for the component
- Task 1.3: Hook up "Hello World" from component inside the debug page
- Task 1.4: Set up hot module reload and visible console logging for state

## Test Cases

### 1. Debug Page Loading

**Description**: Verify that the debug.html page loads correctly and displays the expected UI elements.

**Test Steps**:
1. Navigate to the debug.html page
2. Verify the page title is "GramFrame Debug Page"
3. Verify the page contains a spectrogram config table
4. Verify the page contains a diagnostics panel

**Expected Results**:
- Page loads without errors
- All UI elements are visible and properly styled
- Page title is "GramFrame Debug Page"

### 2. Hello World Component

**Description**: Verify that the component displays a "Hello World" message when the page loads.

**Test Steps**:
1. Navigate to the debug.html page
2. Observe the component initialization process

**Expected Results**:
- Component initializes without errors
- "Hello World" message appears in the component container
- The component replaces the spectrogram config table

### 3. CSS Styling Basics

**Description**: Verify that the component has basic styling applied.

**Test Steps**:
1. Navigate to the debug.html page
2. Inspect the component container

**Expected Results**:
- Component container has the correct layout and styling
- Basic styles defined in gramframe.css are applied

### 4. Hot Module Reload

**Description**: Verify that hot module reload works correctly.

**Test Steps**:
1. Start the Vite development server
2. Navigate to the debug.html page
3. Make a small change to the component code
4. Save the file

**Expected Results**:
- Page updates without a full refresh
- Changes are immediately visible

### 5. Console Logging

**Description**: Verify that state changes are logged to the console.

**Test Steps**:
1. Navigate to the debug.html page
2. Open browser developer tools
3. Observe console output during page load and interactions

**Expected Results**:
- Initial state is logged to the console
- State changes are logged to the console
- Console messages are clear and informative

## Test Environment

- Browser: Chrome (latest version)
- Development server: Vite
- Test data: Sample spectrogram config table in debug.html

## Test Dependencies

- Task 1.1 must be completed before testing
- Task 1.2 must be completed before testing CSS styling
- Task 1.3 must be completed before testing Hello World component
- Task 1.4 must be completed before testing hot module reload
- Vite development server must be running

## Notes

- These tests focus on manual verification for Phase 1
- More comprehensive tests will be added in later phases
