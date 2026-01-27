# Story: 008 - Dark Mode Toggle

**As a** user
**I want to** switch between light and dark themes
**So that** I can use the app comfortably in different lighting conditions

**Story Points:** 3
**Priority:** Medium
**Epic:** User Experience

## Acceptance Criteria

### AC1: Theme toggle
**Given** I am using the app
**When** I click the theme toggle in the header
**Then** the app switches between light and dark mode

### AC2: Theme persistence
**Given** I select dark mode
**When** I close and reopen the app
**Then** my theme preference is remembered

### AC3: System preference detection
**Given** I haven't set a theme preference
**When** I first load the app
**Then** the theme matches my system preference (prefers-color-scheme)

### AC4: Consistent styling
**Given** dark mode is active
**When** I navigate to any page
**Then** all components use appropriate dark theme colors

### AC5: Card images remain clear
**Given** dark mode is active
**When** I view card images
**Then** they display clearly without unwanted color filters

## Technical Notes
- `theme-context.tsx` already exists - extend it
- Use MUI's built-in theme switching (`createTheme` with `mode`)
- Store preference in localStorage
- CSS custom properties for easy theming

## Dependencies
- Existing theme-context
- MUI theming system

## Out of Scope
- Custom theme colors
- Multiple theme presets
