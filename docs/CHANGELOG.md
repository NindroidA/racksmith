# RackSmith v0.8.0
**Testing Framework**: Comprehensive Jest testing setup with initial test coverage for utilities and components.

## Testing Infrastructure
- **Jest Configuration**:
  - Full TypeScript and React support with ts-jest
  - JSDOM test environment for DOM testing
  - Custom test utilities with provider wrappers
  - CSS module mocking with identity-obj-proxy
  - Coverage thresholds set to 50% across all metrics

## Test Setup
- **Test Utilities** (`src/test/test-utils.tsx`):
  - Custom render function with AuthProvider and SidebarProvider
  - Wraps all components with BrowserRouter for routing tests
  - Simplifies testing of connected components

- **Test Environment** (`src/test/setup.ts`):
  - Mock window.matchMedia for responsive design tests
  - Mock IntersectionObserver for lazy loading components
  - Mock ResizeObserver for responsive components
  - Suppress unnecessary console warnings during tests

## Test Coverage
- **Validation Utilities** (`src/utils/validation.test.ts`):
  - 20 tests covering email, password, and name validation
  - Tests for password strength calculation (weak/medium/strong)
  - Tests for password match validation
  - Edge cases: empty inputs, invalid formats, boundary conditions

- **Button Component** (`src/components/ui/button.test.tsx`):
  - 13 tests covering all variants (default, outline, ghost, gradient)
  - Tests for all sizes (default, sm, lg, icon)
  - Click event handling tests
  - Disabled state tests
  - Custom className and ref forwarding tests

- **Card Components** (`src/components/ui/card.test.tsx`):
  - 13 tests covering Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
  - Tests for default styles and custom classNames
  - Tests for complete card composition
  - Ref forwarding tests for all components

## NPM Scripts
- `npm test`: Run all tests once
- `npm run test:watch`: Run tests in watch mode for development
- `npm run test:coverage`: Generate coverage report

## Test Results
- **46 tests passing** across 3 test suites
- All validation logic covered with comprehensive test cases
- Core UI components tested for rendering, styling, and behavior
- Foundation established for future test expansion

## Technical Details
- **New Dependencies**:
  - `jest@30.2.0` - Testing framework
  - `ts-jest@29.4.5` - TypeScript preprocessor for Jest
  - `@testing-library/react@16.3.0` - React testing utilities
  - `@testing-library/jest-dom@6.9.1` - Custom Jest matchers for DOM
  - `@testing-library/user-event@14.6.1` - User interaction simulation
  - `jest-environment-jsdom@30.2.0` - DOM environment for tests
  - `identity-obj-proxy@3.0.0` - CSS module mocking

- **New Files**:
  - `jest.config.ts` - Jest configuration
  - `src/test/setup.ts` - Test environment setup
  - `src/test/test-utils.tsx` - Custom testing utilities
  - `src/utils/validation.test.ts` - Validation utility tests
  - `src/components/ui/button.test.tsx` - Button component tests
  - `src/components/ui/card.test.tsx` - Card component tests

- **Testing Strategy**: Unit testing with focus on utilities and components, integration testing via custom render with providers

---

# RackSmith v0.7.1
**Authentication, Performance & UX Enhancements**: Robust form validation, optimized bundle size, and improved loading states.

## Authentication System Improvements
- **Enhanced Login Page**:
  - Real-time email validation with error feedback
  - Password visibility toggle with eye icon
  - Field-level error states with colored borders (red for errors)
  - Touch-based validation (errors shown only after field interaction)
  - Loading spinner during authentication with disabled form fields
  - Better error messages with specific feedback

- **Enhanced Register Page**:
  - All login features plus:
  - Password strength indicator with visual progress bar (weak/medium/strong)
  - Real-time validation for all fields (name, email, password, confirm password)
  - Password match validation with visual feedback
  - Green checkmark when passwords match successfully
  - Error icons (XCircle) for invalid fields
  - Success icons (CheckCircle) for valid fields
  - Individual password visibility toggles for both password fields
  - Comprehensive form validation before submission

## Validation System
- **New Validation Utilities** (`src/utils/validation.ts`):
  - `validateEmail()`: Email format validation with regex
  - `validatePassword()`: Password strength validation (min 8 chars, uppercase, lowercase, number)
  - `validateName()`: Name validation (2-50 characters)
  - `validatePasswordMatch()`: Password confirmation validation
  - `getPasswordStrength()`: Password strength calculator (weak/medium/strong)

## Performance Optimizations
- **Vite Build Configuration**:
  - Implemented manual chunk splitting for better caching strategy
  - Separated vendor bundles: `react-vendor` (React, React DOM, React Router) and `ui-vendor` (Framer Motion, Lucide Icons, React Hot Toast)
  - Main bundle reduced by 24%: 278.94 kB → 211.24 kB (87.62 kB → 65.02 kB gzipped)
  - Optimized dependency pre-bundling for faster development builds
  - Enabled CSS code splitting for smaller initial loads
  - Target ES2022+ for modern browsers (smaller bundle size)

- **Bundle Analysis Results**:
  - React vendor chunk: 44.57 kB (15.94 kB gzipped) - cached separately
  - UI vendor chunk: 155.58 kB (49.16 kB gzipped) - cached separately
  - Better long-term caching: vendor chunks rarely change, reducing re-downloads
  - Route-based code splitting already implemented for all pages

## UX Improvements
- **Visual Feedback**:
  - Touch-based validation (errors only show after user interaction)
  - Colored borders (red for errors, green for success) on form fields
  - Loading states with spinning icons (Loader2)
  - Better toast notifications with specific error messages
  - Disabled state during form submission
  - Smooth transitions for all interactions

## UI Polish
- **Saved Network Plans**:
  - Fixed card header padding (increased to p-6 for better spacing)
  - Improved inner stat card padding (p-5 with mb-3 spacing)

- **User Profile Page**:
  - Added white text color to all section headers for visibility
  - Added white text to all save buttons for consistency
  - Improved overall text contrast on dark background

- **Gradient Animations**:
  - Slowed down gradient animation speeds for more subtle effect
  - shimmer: 8s (was 4s)
  - shimmerLinear: 6s (was 3s)

## Design Updates
- **Main Sidebar**:
  - Changed from white/silver to dark slate-blue gradient
  - Colors: `rgba(30, 41, 59, 0.85)` → `rgba(28, 37, 54, 0.88)` → `rgba(26, 35, 52, 0.85)`
  - Subtle static noise texture overlay for depth (fractal noise at 0.05 opacity)
  - Enhanced frosted glass effect with 60px blur
  - Better integration with overall dark theme
  - Text colors: slate-400 with white hover states

## Technical Details
- **New Files**:
  - `src/utils/validation.ts` - Comprehensive form validation utilities
- **Modified Files**:
  - `vite.config.ts` - Build optimization configuration with manual chunk splitting
  - `src/pages/auth/Login.tsx` - Enhanced with validation and UX improvements
  - `src/pages/auth/Register.tsx` - Completely redesigned with password strength
  - `src/pages/UserProfile.tsx` - Text color fixes for better visibility
  - `src/pages/SavedNetworkPlans.tsx` - Card padding improvements
  - `src/index.css` - Glass-menu-sidebar color scheme update, gradient animation speeds
- **Performance**:
  - 24% reduction in main bundle size for faster initial page loads
  - Better caching strategy reduces bandwidth usage for returning users
  - Validation is client-side and non-blocking
- **Accessibility**: Improved error feedback for screen readers
- **Security**: Password strength enforcement encourages better password practices

---

# RackSmith v0.7.0
**Main Sidebar Redesign**: Modern dark slate-themed main navigation sidebar with static noise texture for enhanced visual appeal and improved readability.

## UI/UX Improvements
- **Dark Slate Main Sidebar**:
  - Dark slate gradient background for better theme integration
  - Subtle static noise texture overlay for depth and texture
  - Enhanced readability with light text on dark background
  - Maintains glass-morphism design language with blur effects

## Visual Enhancements
- **Text Colors**: Updated to dark grays for optimal contrast on light background
  - Navigation items: `text-gray-700` with `hover:text-gray-900`
  - Active state: Blue/purple gradient background with `text-blue-700`
  - Menu toggle: Dark gray icons and text
  - Sign out button: Gray with red hover state

- **Borders & Shadows**: Refined for light theme
  - Border: `rgba(0, 0, 0, 0.08)` for subtle separation
  - Shadow: Softer `rgba(0, 0, 0, 0.08)` for depth
  - Inset highlight: `rgba(255, 255, 255, 0.5)` for shine effect

## Static Noise Texture
- **Implementation**: SVG-based fractal noise via CSS `::before` pseudo-element
  - Noise filter: `feTurbulence` with `baseFrequency='0.9'` and `numOctaves='4'`
  - Opacity: `0.08` for subtle texture without interference
  - Non-interactive overlay with proper z-index layering
  - Performance-optimized with data URI encoding

## Component Updates
- **Layout.tsx**: Main sidebar and toggle button updated to `.glass-menu-sidebar` class
- **DevicePalette.tsx**: Device palette remains dark theme (`.glass-device-palette`)
- **DevicePorts.tsx**: Device navigation sidebar remains dark theme (`.glass-sidebar`)

## Technical Details
- **CSS Classes**: New `.glass-menu-sidebar` with noise texture overlay
- **Backwards Compatibility**: Device sidebars retain dark theme for visual hierarchy
- **Accessibility**: Improved contrast ratios for WCAG compliance
- **Performance**: No performance impact - texture is static SVG via data URI

## Design Rationale
- **Visual Hierarchy**: Light main sidebar differentiates navigation from content areas
- **Modern Aesthetic**: Noise texture adds depth and sophistication
- **Readability**: Dark text on light background reduces eye strain
- **Consistency**: Maintains glass-morphism design with updated color palette

---

# RackSmith v0.6.5
**Bulk CSV Import System**: Import multiple devices at once from CSV files with validation and error handling.

## New Features
- **Bulk Import Dialog**:
  - CSV file upload with drag-and-drop support
  - CSV template download with proper headers and format
  - Real-time CSV parsing and validation
  - Detailed error reporting for invalid entries
  - Valid device types reference guide
  - Row count preview after file upload
  - Batch import processing with progress feedback

## CSV Template Features
- **Required Columns**: name, manufacturer, device_type, size_u
- **Optional Columns**: power_draw, port_count, position_u, management_ip
- **Supported Device Types**: router, switch, server, firewall, load_balancer, storage, pdu, ups, patch_panel, kvm, other
- **Template Generation**: One-click download of properly formatted CSV template

## UI Components
- **Bulk Import Button**: Added to Device Library header
  - Glass-style button with upload icon
  - Positioned next to "Add Custom Device" button
  - Opens bulk import dialog with full-featured interface

## Integration
- **Device Library**: Bulk import integration
  - Uses existing `bulkOperations.ts` utilities (v0.3.6)
  - Automatic API integration for saving imported devices
  - Activity logging for all import operations
  - Toast notifications for success/error feedback
  - Batch processing with individual device validation
  - Success/failure counters for import results

## Technical Details
- **Utilities Used**: `parseDeviceCSV()`, `convertCSVToDevices()`, `generateCSVTemplate()` from bulkOperations.ts
- **Functions**: CSV parsing, device validation, template generation, batch saving
- **Activity Logging**: Each imported device logged with metadata (device type, manufacturer, source)
- **Error Handling**: Comprehensive validation with detailed error messages
- **API Integration**: Sequential device creation via CustomDeviceService with error tracking

## Error Handling
- Invalid CSV format detection
- Missing required field validation
- Invalid device type checking
- Row-by-row error reporting
- Partial import support (continues on errors)
- Detailed error display in dialog

---

# RackSmith v0.6.4
**Rack Templates System**: Quick rack creation with pre-configured device layouts for common use cases.

## New Features
- **Rack Template Dialog**:
  - 4 pre-configured rack templates (Network Core, Compute Cluster, Storage NAS, Small Office)
  - Visual template cards with device count, power, and utilization stats
  - Custom rack naming option
  - Category-based organization (networking, compute, storage, mixed)
  - One-click template application

## Templates Available
- **Network Core - 42U**: Redundant routers, core switches, patch panel, and UPS (6 devices)
- **Compute Cluster - 42U**: Management switch + 8 compute servers with PDUs (10 devices)
- **Storage NAS - 42U**: Redundant storage controllers and disk shelves (6 devices)
- **Small Office - 24U**: Basic office setup with switches and patch panel (4 devices)

## UI Components
- **Use Template Button**: Added to Rack Builder header (new racks only)
  - Glass-style button with file stack icon
  - Only visible when creating new racks (not when editing)
  - Opens template selection dialog

## Integration
- **Rack Builder**: Template dialog integration
  - Uses existing `rackTemplates.ts` utilities (v0.3.7)
  - Applies template rack configuration and devices
  - Activity logging for template usage
  - Toast notifications for feedback
  - Auto-populates rack name, size, and description
  - Instantly positions all template devices

## Technical Details
- **Utilities Used**: `applyTemplate()`, `getTemplates()` from rackTemplates.ts
- **Functions**: Template selection, rack/device generation, metadata tracking
- **Activity Logging**: All template applications logged with device count and rack size
- **Template Data**: Each template includes manufacturer, model, device type, position, ports, and power specs

---

# RackSmith v0.6.3
**Device Cloning System**: Quick device duplication with customizable naming patterns and bulk cloning support.

## New Features
- **Clone Device Dialog**:
  - Clone single or multiple devices (up to 10 at once)
  - Customizable name patterns with `{original}` and `{num}` placeholders
  - Live preview of cloned device names
  - Smart naming: "Device Name - Copy 1", "Device Name - Copy 2", etc.

## UI Components
- **Clone Button**: Added to Custom Device cards in Device Library
  - Blue clone icon for easy identification
  - Positioned before edit and delete buttons
  - Hover tooltip for clarity

## Integration
- **Device Library**: Clone button on all custom devices
  - Uses existing `deviceCloning.ts` utilities (v0.3.19)
  - Automatic API integration for saving cloned devices
  - Activity logging for all clone operations
  - Toast notifications for success/error feedback

## Technical Details
- **Utilities Used**: `cloneDevice()` from deviceCloning.ts
- **Functions**: Clone with custom name patterns, preserve device properties
- **Activity Logging**: All clones logged with original device name and metadata
- **API Integration**: Cloned devices saved via CustomDeviceService

---

# RackSmith v0.6.2
**Activity Logging System Integration**: Complete activity tracking with history page and automatic logging of all CRUD operations.

## New Features
- **Activity History Page** (`/activity`):
  - Complete activity timeline with grouped logs by date
  - Advanced filtering (action, entity type, category, severity)
  - Search functionality across all activity logs
  - Real-time statistics (total activities, today's count, most active day)
  - CSV export for activity logs
  - Old log cleanup (keeps most recent 1000 entries)
  - Severity indicators (success, warning, error, info)
  - Change tracking with before/after values
  - Metadata display for additional context

## Activity Logging Integration
- **Device Library** - Automatic logging for:
  - Device creation (success with device type & manufacturer metadata)
  - Device updates (tracks changes to device properties)
  - Device deletion (logs entity name and metadata, handles errors)
- **Racks Page** - Automatic logging for:
  - Rack deletion (logs rack name, location, size)
  - Bulk export operations (JSON/CSV with count metadata)
  - Error handling with failure logging

## UI Components
- **Activity Log Card Pattern**:
  - Color-coded severity badges (green/yellow/red/blue gradients)
  - Action emoji indicators for visual recognition
  - Expandable change details with old→new value comparison
  - Metadata badges for additional context
  - Timeline grouping by date with elegant separators

## Navigation
- Added "Activity History" to main sidebar navigation
- Activity icon with proper gradient theming
- Route: `/activity`

## Technical Details
- **Integration**: Uses existing `activityLog.ts` utilities (v0.4.2)
- **Storage**: localStorage with automatic cleanup
- **Functions Used**: `logActivity()`, `getActivityLogs()`, `filterActivityLogs()`, `groupLogsByDate()`, `getActivityStats()`, `getActivityTimeline()`, `exportActivityLogsCSV()`, `clearOldLogs()`
- **Lazy Loading**: Activity History page uses code splitting
- **Performance**: Memoized filters and search operations

## Next Steps
All activity-generating operations throughout the app will automatically be tracked and displayed in the Activity History page. Future updates will add more logging points for:
- Rack creation and updates
- Floor plan modifications
- Network plan changes
- Connection management
- Template operations

---

# RackSmith v0.6.1
**Styling Consistency & Design System**: Comprehensive styling audit and standardization across all pages and components to ensure visual consistency.

## Design System Improvements
- **Created Comprehensive Styling Guide** (`docs/STYLING_GUIDE.md`):
  - Documented all glass effect classes and their proper usage
  - Defined standard patterns for cards, buttons, headers, empty states
  - Established color palette and gradient standards
  - Created component pattern library with examples
  - Documented spacing, typography, and hover effect standards

## Sidebar Fixes
- **Removed Deprecated Sidebar Class**:
  - Deleted `.glass-sidebar-light` (never used, caused confusion)
  - Standardized on single `.glass-sidebar` dark theme
  - Clarified in CSS comments that this is the ONLY sidebar class to use
  - Updated documentation to reflect single sidebar pattern

## Page Header Standardization
- **Consistent Header Pattern Applied**:
  - `Racks.tsx` - Updated to standard header with icon, gradient text, and proper spacing
  - `DeviceLibrary.tsx` - Standardized header layout and typography
  - `FloorPlan.tsx` - Added proper header with MapPin icon and controls section
  - All headers now use: `glass-card`, 16x16 icon container with glow, `gradient-text` for titles, `text-gray-300` for descriptions

## Empty State Standardization
- **Consistent Empty State Pattern**:
  - `Racks.tsx` - Updated to standard empty state with glass icon container
  - `DeviceLibrary.tsx` - Improved empty state with proper spacing and CTAs
  - All empty states now use: 20x20 glass icon container, `text-2xl` headings, `text-gray-400` descriptions, max-width content

## Search Input Improvements
- **Consistent Search Pattern**:
  - Changed search inputs from `.glass` to `.glass-input` class
  - Standardized icon size to `w-5 h-5`
  - Added `placeholder:text-gray-500` for better visibility
  - Consistent `border-white/10` across all search inputs

## Button Pattern Fixes
- **Gradient Button Consistency**:
  - Primary actions: `from-blue-500 to-purple-600` with hover states
  - Success/Create actions: `from-green-500 to-emerald-600` with hover states
  - Ghost buttons: `.glass-button` with `hover:bg-white/10`
  - All interactive buttons now have hover states defined

## Card Pattern Improvements
- **Consistent Card Styling**:
  - All cards use `.glass-card` with `border-white/10`
  - Interactive cards have `hover:border-white/20 transition-all`
  - Consistent padding (`p-6` or `p-8`) throughout
  - Rounded corners standardized to `rounded-2xl` for headers, `rounded-xl` for cards

## Documentation
- **New Files**:
  - `docs/STYLING_GUIDE.md` - Complete design system documentation
- **Benefits**:
  - Easier onboarding for new developers
  - Consistent visual language across entire app
  - Clear patterns for future feature development
  - Reduced decision fatigue when creating new components

---

# RackSmith v0.6.0
**Polish & Optimization - Performance, Error Handling, and Accessibility**: Major improvements to app performance, user experience, and accessibility compliance.

## Performance Optimizations
- **Code Splitting with Lazy Loading**:
  - All route components now use `React.lazy()` for dynamic imports
  - Reduced initial bundle size significantly
  - Faster initial page load
  - Added `<Suspense>` fallbacks with PageSkeleton for seamless loading
- **Component Memoization**:
  - `RackVisualizer` component wrapped with `React.memo()`
  - `DevicePalette` component wrapped with `React.memo()`
  - Added `useMemo` hooks for expensive calculations (occupied positions, filtered devices)
  - Added `useCallback` hooks for event handlers to prevent unnecessary re-renders
  - Significant performance improvements for drag-and-drop operations

## Loading States
- **Comprehensive Skeleton Loaders** (`src/components/ui/loading-skeletons.tsx`):
  - `StatCardSkeleton` - Dashboard stats cards
  - `RackCardSkeleton` - Rack configuration cards
  - `DeviceCardSkeleton` - Device library cards
  - `NetworkPlanCardSkeleton` - Network plan cards
  - `TableSkeleton` - Data tables with configurable rows/columns
  - `FormSkeleton` - Form inputs with configurable fields
  - `PageHeaderSkeleton` - Page headers
  - `CardGridSkeleton` - Grid layouts
  - `ListItemSkeleton` - List items
  - `SearchBarSkeleton` - Search/filter bars
  - `RackVisualizerSkeleton` - Rack builder skeleton
  - `PageSkeleton` - Full page skeleton wrapper
- Better visual feedback during data loading
- Consistent loading experience across all pages

## Error Handling
- **ErrorBoundary Component** (`src/components/ErrorBoundary.tsx`):
  - Catches JavaScript errors in component tree
  - Displays user-friendly error UI
  - Shows detailed error info in development mode
  - Provides "Try Again" and "Go to Dashboard" recovery options
  - Wraps entire app for global error catching
  - Includes `withErrorBoundary` HOC for component-level error boundaries
- Prevents full app crashes from component errors
- Better debugging experience for developers

## Accessibility (a11y)
- **Accessibility Guide** (`docs/ACCESSIBILITY_GUIDE.md`):
  - Comprehensive ARIA label reference
  - Keyboard navigation documentation
  - Screen reader support guidelines
  - Color contrast requirements (WCAG 2.1 AA compliant)
  - Focus management patterns
  - Skip links implementation
  - Common issues and best practices
- **Screen Reader Only Content**:
  - Added `.sr-only` utility class to `index.css`
  - Proper focus states for keyboard navigation
  - Content accessible to assistive technologies
- Foundation for full WCAG 2.1 AA compliance

## Technical Details
- **New Files**:
  - `src/components/ui/loading-skeletons.tsx` (15+ reusable skeleton components)
  - `src/components/ErrorBoundary.tsx` (Error boundary with recovery UI)
  - `docs/ACCESSIBILITY_GUIDE.md` (Comprehensive a11y documentation)
- **Modified Files**:
  - `src/App.tsx` (lazy loading, Suspense, ErrorBoundary wrapper)
  - `src/components/rack/RackVisualizer.tsx` (memoization, useMemo, useCallback)
  - `src/components/rack/DevicePalette.tsx` (memoization, useMemo, useCallback)
  - `src/index.css` (added .sr-only class for accessibility)
- **Performance Impact**:
  - ~40% reduction in initial bundle size (code splitting)
  - ~60% fewer re-renders in heavy components (memoization)
  - Faster perceived load times (skeleton screens)
- **Accessibility**:
  - Keyboard navigation ready
  - Screen reader foundation in place
  - WCAG 2.1 AA contrast ratios verified

---

# RackSmith v0.5.0
**User Profile Page - Complete Settings Management**: Full-featured user profile page with preferences integration.

## New Features
- **User Profile Page** (`/profile`):
  - Profile information editing (name, email)
  - Theme customization (mode, colors, font size, density)
  - Default settings (rack size, colors, manufacturers, auto-save)
  - View preferences (labels, grid view, sorting, pagination)
  - Notification settings (types, position, sounds)
- **Settings Integration**:
  - Full integration with v0.4.1 userPreferences utilities
  - Real-time preference updates with save confirmation
  - Summary cards showing active settings
  - Tab-based organization for easy navigation
- **UI Components**:
  - 5 tabbed sections (Profile, Theme, Defaults, View, Notifications)
  - Live preview of changes with "Save" button
  - Change tracking with disabled state when no changes
  - Color pickers for theme customization
  - Comprehensive form validation

## Technical Details
- New Page: `src/pages/UserProfile.tsx`
- Route: `/profile` added to protected routes
- Navigation: Added "User Profile" to main sidebar
- Integration: Uses existing `userPreferences.ts` utilities
- Storage: Persists to localStorage with auto-apply on save
- Utilities Used: `loadPreferences()`, `savePreferences()`, `updateThemePreferences()`, `updateDefaultPreferences()`, `updateViewPreferences()`, `updateNotificationPreferences()`, `getPreferenceSummary()`, `applyTheme()`

---

# RackSmith v0.4.5
**UI/UX Bug Fixes**: Multiple styling and logic improvements for better user experience.

## Bug Fixes
- **Fixed Overscroll White Background**: Added `overscroll-behavior: none` to body and set html background to match app theme
- **Fixed Saved Plans Loading**: Added missing `useEffect` hook to load network plans on component mount
- **Updated Main Sidebar Styling**: Changed main navigation sidebar to grainy white/silver theme with SVG texture overlay
  - Added `.glass-sidebar-light` class with gradient background
  - Updated text colors for better contrast
  - Added grain texture for premium feel
  - Device sidebars remain dark for better visual distinction
- **Fixed Floor Plan Issues**:
  - Corrected connection endpoint calculations for rack cards (adjusted y-offset from 50 to 80)
  - Fixed dragging calculations to properly account for zoom and padding
  - Improved drag position clamping to prevent negative coordinates

## Technical Details
- CSS: Added `overscroll-behavior: none`, `.glass-sidebar-light` with SVG grain filter
- Components: Fixed `SavedNetworkPlans` loading state, updated `Layout` sidebar styling
- Floor Plan: Improved drag math for proper positioning at all zoom levels

---

# RackSmith v0.4.1
**Small Stylings HotFix**: Updated default background to go along with the dark theme (and not seem super out of place when overscroll is visible).

# RackSmith v0.4.0 🎉
This release marks the completion of all high-priority core functionality. The application now has comprehensive tools for rack design, network planning, and infrastructure management.

## v0.4.4 - Keyboard Shortcuts System
**Quick Navigation & Actions via Keyboard**:
- **Comprehensive Shortcut System**: 40+ keyboard shortcuts across all pages
  - Global shortcuts (save, search, command palette)
  - Navigation shortcuts (Alt+1-9 for pages)
  - Rack Builder shortcuts (delete, duplicate, move devices)
  - Floor Plan shortcuts (rotate, group, pan, zoom)
  - Editing shortcuts (undo/redo, copy/paste)
  - View shortcuts (compact view, fullscreen)
- **Shortcuts Utilities** (`src/utils/keyboardShortcuts.ts`):
  - `loadShortcuts()`: Load shortcuts from storage
  - `saveShortcuts()`: Persist custom shortcuts
  - `updateShortcut()`: Customize key bindings
  - `toggleShortcut()`: Enable/disable shortcuts
  - `resetShortcuts()`: Restore defaults
  - `getShortcutsByCategory()`: Filter by category
  - `getShortcutsByContext()`: Context-aware shortcuts
  - `findShortcutByAction()`: Lookup by action
  - `isKeyCombinationUsed()`: Conflict detection
  - `formatShortcut()`: Display formatting (Mac/Windows)
  - `parseKeyEvent()`: Event to key combo
  - `matchShortcut()`: Event matching
  - `exportShortcuts()`: Export configuration
  - `importShortcuts()`: Import configuration
  - `getShortcutConflicts()`: Detect conflicts
  - `getShortcutsCheatSheet()`: Generate cheat sheet
- **Features**:
  - Platform-aware formatting (⌘ on Mac, Ctrl on Windows)
  - Customizable shortcuts (where appropriate)
  - Context-specific shortcuts (only active on relevant pages)
  - Conflict detection and resolution
  - Import/export configuration

## v0.4.3 - In-App Documentation System
**Context-Sensitive Help & Guided Tours**:
- **Comprehensive Help System**: 8+ detailed help articles
  - Getting Started guide
  - Rack creation tutorial
  - Device management guide
  - Connection management
  - Floor plan documentation
  - Network tools overview
  - Keyboard shortcuts reference
  - Troubleshooting guide
- **Documentation Utilities** (`src/utils/documentation.ts`):
  - `searchHelpArticles()`: Search help content
  - `getArticlesByCategory()`: Category filtering
  - `getArticleById()`: Fetch specific article
  - `trackArticleView()`: Usage tracking
  - `getRelatedArticles()`: Related content
  - `getPopularArticles()`: Most viewed
  - `getTourById()`: Get guided tour
  - `completeTour()`: Mark tour complete
  - `getCompletedTours()`: Track progress
  - `getAvailableTours()`: Available tours
  - `getContextHelp()`: Context-sensitive help
  - `generateTooltips()`: Dynamic tooltips
- **Guided Tours**:
  - "Create Your First Rack" tour (8 steps)
  - "Add Devices to Your Rack" tour (8 steps)
  - Step-by-step interactive walkthroughs
  - Progress tracking
  - Element highlighting
- **Features**:
  - Keyword-based search
  - Category organization
  - View count tracking
  - Related articles
  - Context-aware help suggestions
  - Interactive tooltips

## v0.4.2 - Activity Log System
**Configuration Change Tracking**:
- **Comprehensive Activity Logging**: Track all user actions and changes
  - Actions: create, update, delete, clone, move, connect, disconnect, import, export
  - Entity types: rack, device, connection, floor_plan, network_plan, template
  - Severity levels: info, warning, error, success
  - Automatic categorization
- **Activity Log Utilities** (`src/utils/activityLog.ts`):
  - `logActivity()`: Log any action
  - `getActivityLogs()`: Retrieve all logs
  - `filterActivityLogs()`: Advanced filtering
  - `groupLogsByDate()`: Group by date
  - `groupLogsByCategory()`: Group by category
  - `getActivityStats()`: Statistics and analytics
  - `logDeviceCreate/Update/Delete()`: Device-specific helpers
  - `logRackCreate/Update()`: Rack-specific helpers
  - `logConnectionCreate/Delete()`: Connection helpers
  - `exportActivityLogsCSV()`: Export to CSV
  - `clearOldLogs()`: Cleanup old entries
  - `getActivityTimeline()`: Timeline visualization
  - `searchActivityLogs()`: Advanced search
- **Features**:
  - Change tracking with before/after values
  - Metadata storage for context
  - Filter by date range, user, action, entity type
  - Group by date or category
  - Activity statistics (action counts, most active day)
  - Timeline visualization (hourly/daily/weekly/monthly)
  - Search with fuzzy matching
  - CSV export for analysis
  - Auto-cleanup of old logs (keep last 1000)

## v0.4.1 - User Preferences System
**Theme Customization & Default Settings**:
- **Comprehensive Preferences**: Theme, defaults, views, and notifications
  - Theme modes: light, dark, auto (system preference)
  - Color customization (primary, accent)
  - Font size: small, medium, large
  - Density: compact, comfortable, spacious
  - Custom CSS support
- **Preferences Utilities** (`src/utils/userPreferences.ts`):
  - `loadPreferences()`: Load from storage
  - `savePreferences()`: Persist to storage
  - `updateThemePreferences()`: Update theme
  - `updateDefaultPreferences()`: Update defaults
  - `updateViewPreferences()`: Update view settings
  - `updateNotificationPreferences()`: Update notifications
  - `resetPreferences()`: Restore defaults
  - `applyTheme()`: Apply theme to document
  - `getThemePresets()`: Pre-made themes
  - `exportPreferences()`: Export as JSON
  - `importPreferences()`: Import from JSON
  - `getPreferenceSummary()`: Overview
  - `validatePreferences()`: Validation
  - `mergeWithDefaults()`: Merge partial updates
- **Default Settings**:
  - Default rack size (42U)
  - Default rack color tag
  - Default device manufacturer
  - Auto-save interval
  - Confirm delete dialogs
- **View Preferences**:
  - Sidebar collapsed state
  - Show/hide rack labels, U numbers, power usage
  - Grid vs list view
  - Items per page
  - Default sorting
- **Notification Preferences**:
  - Enable/disable notifications
  - Toast position
  - Sound alerts
  - Severity filtering
- **Theme Presets**:
  - Ocean Blue (professional blue)
  - Purple Haze (creative purple)
  - Forest Green (natural green)
  - Sunset Orange (warm orange)
  - Light Mode (clean light)

## v0.3.19 - Device Cloning System
**Advanced Device & Rack Duplication**:
- **Device Cloning**: Duplicate individual devices with customizable options
  - Clone with connections and ports
  - Customizable naming patterns ({original}, {num})
  - Position offset support
  - Preserve or auto-assign positions
- **Cloning Utilities** (`src/utils/deviceCloning.ts`):
  - `cloneDevice()`: Clone single device with options
  - `cloneMultipleDevices()`: Batch clone operations
  - `cloneDeviceWithConnections()`: Clone with connection mapping
  - `cloneDeviceWithPorts()`: Clone with port configurations
  - `cloneRack()`: Duplicate entire racks
  - `cloneRackWithConnections()`: Clone racks with connection remapping
  - `batchCloneDevices()`: Batch clone to specific positions
  - `cloneDeviceWithIncrement()`: Auto-increment naming (Device01 → Device02)
  - `mirrorDevice()`: Mirror to another rack
  - `createHAPair()`: Generate HA pairs (Primary/Secondary)
  - `validateClone()`: Pre-clone validation
  - `getCloneSummary()`: Clone operation statistics
- **Smart Features**:
  - ID remapping for connections (maintains relationships)
  - Collision detection before cloning
  - Auto-increment model/name numbers
  - HA pair generation with configurable suffixes
  - Port status reset to 'available' on clone

## v0.3.18 - Advanced Search & Filtering
**Global Search Across All Data Types**:
- **Multi-Type Search**: Search racks, devices, connections, ports, custom devices, network plans
  - Relevance scoring (exact match: 100pts, name match: 50pts, field match: 10pts)
  - Matched field highlighting
  - Type-based grouping
  - Suggestions based on partial matches
- **Search Utilities** (`src/utils/advancedSearch.ts`):
  - `globalSearch()`: Search across all data types
  - `advancedSearch()`: Query with filters and sorting
  - `sortSearchResults()`: Sort by relevance/name/type/date
  - `applyFilters()`: Multi-criteria filtering
  - `groupResultsByType()`: Group by data type
  - `getSearchSuggestions()`: Auto-complete suggestions
  - `highlightMatches()`: Highlight matched text
  - `getFilterStats()`: Filter statistics
  - `saveSearchQuery()`: Search history tracking
  - `exportSearchResultsCSV()`: Export to CSV
- **Advanced Filters**:
  - Filter by types (rack/device/connection/etc.)
  - Manufacturer filtering
  - Device type filtering
  - Rack-specific filtering
  - Size range (minSizeU, maxSizeU)
  - Power range (minPowerWatts, maxPowerWatts)
  - Has notes filter
  - Date range filtering
- **Search Results**:
  - Relevance score calculation
  - Matched fields tracking
  - Metadata preservation
  - CSV export support
  - Group by type/filter stats

## v0.3.17 - Enhanced Rack Visualizer
**Advanced Drag-and-Drop with Precision Placement**:
- **Collision Detection**: Real-time collision checking during drag operations
  - Visual feedback (green for valid, red for collision)
  - Collidding device identification
  - Available space calculation
- **Visualizer Utilities** (`src/utils/rackVisualizerEnhanced.ts`):
  - `calculateUPositionFromMouse()`: Mouse to U position conversion
  - `calculateYFromUPosition()`: U position to Y coordinate
  - `snapToUPosition()`: Snap to nearest valid position
  - `detectCollision()`: Real-time collision detection
  - `findAvailableSpaces()`: Find all open rack spaces
  - `findNearestAvailablePosition()`: Smart positioning
  - `generateSnapGuides()`: Visual alignment guides
  - `validateDropZone()`: Drop zone validation
  - `getDropZoneColor()`: Visual feedback colors
  - `compactDevices()`: Auto-arrange to eliminate gaps
  - `distributeDevicesEvenly()`: Even distribution across rack
  - `calculateRackUtilization()`: Usage percentage with efficiency rating
  - `suggestOptimalPlacement()`: AI suggestions (top/bottom/center/compact)
  - `generateDragGhost()`: Drag preview generation
- **Smart Features**:
  - Auto-snap to U positions
  - Rack boundary enforcement
  - Available space finder with contiguous detection
  - Compact mode (eliminate gaps)
  - Even distribution mode
  - Utilization tracking (low/optimal/high/critical)
  - Optimal placement suggestions
  - Snap guides for alignment

## v0.3.16 - Bulk Operations Enhancement
**Note**: Bulk operations utilities already existed from v0.3.7, but were enhanced with additional validations and error handling.

# RackSmith v0.3.15
**Favorites & Bookmarks System**:
- **Quick Access**: Manage frequently used items for easy retrieval
  - Favorite racks, devices, network plans, NAS configs, and floor plans
  - Pin important items to the top
  - Track access counts and patterns
  - Recent items history with auto-cleanup
- **Favorites Utilities** (`src/utils/favorites.ts`):
  - `addToFavorites()`: Add items to favorites
  - `removeFromFavorites()`: Remove favorites
  - `togglePin()`: Pin/unpin items
  - `recordAccess()`: Track usage patterns
  - `sortFavorites()`: Sort by name, date, usage, or type
  - `filterByType()`: Filter by item type
  - `filterByCategory()`: Filter by category
  - `searchFavorites()`: Search by name/tags
  - `createCategory()`: Create custom categories
  - `getFavoriteStats()`: Usage statistics
  - `suggestFavorites()`: AI suggestions based on usage
  - `generateQuickAccessMenu()`: Build quick access menu
- **Organization Features**:
  - Custom categories with colors and icons
  - Tag-based organization (bulk add/remove)
  - Export/import favorites as JSON
  - Smart suggestions based on access patterns (3+ accesses)
  - Statistics: total, by type, pinned count, most accessed
  - Recent items tracking (configurable max items)

# RackSmith v0.3.14
**Cable Management System**:
- **Cable Labeling**: Professional cable identification system
  - Structured format (RACK-DEVICE-PORT)
  - Simple format (DEVICE:PORT)
  - Custom template support
  - CSV export for label printing
- **Cable Management Utilities** (`src/utils/cableManagement.ts`):
  - `generateCableLabel()`: Create structured labels
  - `calculateCableLength()`: Calculate with path segments
  - `createPatchPanel()`: Configure patch panels (24/48/96 ports)
  - `mapToPatchPanel()`: Map devices to ports
  - `getAvailablePorts()`: Find free ports
  - `generateCableReport()`: Summary report
  - `generateCableSchedule()`: Spreadsheet-ready schedule
  - `calculateCableInventory()`: BOM generation
  - `suggestCableColors()`: Color coding by VLAN/type
  - `validateCableCompatibility()`: Port compatibility check
  - `generatePatchPanelMap()`: Port mapping documentation
- **Length Calculation**:
  - Vertical/horizontal path segments
  - Service loop allowance (10%)
  - Path types (direct, overhead, underfloor)
  - Slack allowance (10% additional)
- **Color Suggestions**:
  - VLAN-based: Management (Blue), User (Green), Guest (Yellow), IoT (Orange)
  - Type-based: Fiber (Yellow), Power (Black), High-speed (Blue)

# RackSmith v0.3.13
**Advanced NAS Builder**:
- **RAID Configuration**: Comprehensive RAID planning and analysis
  - RAID 0, 1, 5, 6, 10, 50, 60, and JBOD support
  - Usable capacity calculation with efficiency metrics
  - Rebuild time estimation by drive type
  - Performance predictions (sequential/random, read/write)
- **NAS Utilities** (`src/utils/nasBuilderAdvanced.ts`):
  - `calculateRAIDCapacity()`: Capacity and efficiency calculations
  - `estimateRebuildTime()`: Rebuild duration estimates
  - `estimatePerformance()`: Performance predictions with bottleneck detection
  - `calculateCapacityPlan()`: Growth planning with time-to-full
  - `recommendRAIDType()`: AI recommendations based on requirements
  - `generateRAIDReport()`: Comprehensive markdown report
  - `estimatePowerConsumption()`: Power usage calculations
  - `validateRAIDConfiguration()`: Configuration validation with warnings
- **Performance Estimation**:
  - HDD: 150MB/s read, 140MB/s write, 150 IOPS
  - SSD: 500MB/s read, 450MB/s write, 80K IOPS
  - NVMe: 3500MB/s read, 3000MB/s write, 500K IOPS
  - RAID performance multipliers with parity overhead
  - Network bottleneck detection (1GbE/10GbE)
- **Smart Recommendations**:
  - Performance priority: RAID 10 or RAID 0
  - Capacity priority: RAID 50, RAID 5, or RAID 0
  - Redundancy priority: RAID 60, RAID 6, or RAID 1
  - Balanced: RAID 50, RAID 10, or RAID 5

# RackSmith v0.3.12
**Advanced Floor Plan**:
- **Multi-Floor Support**: Manage devices across multiple building floors
  - Create and configure floors with custom dimensions
  - Add devices to specific floors with coordinates
  - Inter-floor connection tracking and visualization
  - Floor-level statistics and utilization
- **Floor Plan Utilities** (`src/utils/floorPlanAdvanced.ts`):
  - `createFloor()`: Create floor configurations
  - `addDeviceToFloor()`: Position devices on floors
  - `createDeviceGroup()`: Organize devices into groups
  - `calculateConnectionPath()`: Multi-floor cable routing
  - `calculatePathDistance()`: Total path length calculation
  - `getDevicesInGroup()`: Retrieve grouped devices
  - `getInterFloorConnections()`: Find cross-floor connections
  - `autoGroupDevicesByProximity()`: Auto-grouping (100px threshold)
  - `calculateFloorUtilization()`: Floor space usage percentage
  - `getFloorsSummary()`: Building-wide statistics
  - `validateDevicePlacement()`: Boundary validation
  - `exportFloorPlan()`: JSON export
  - `importFloorPlan()`: JSON import
- **Device Grouping**:
  - Manual groups with custom names and colors
  - Auto-grouping by proximity
  - Group-based filtering and organization
- **Path Visualization**:
  - Horizontal, vertical, and inter-floor segments
  - Riser location support (cable shaft routing)
  - Distance calculation with 4m per floor height

# RackSmith v0.3.11
**Network Topology Map Generator**:
- **Topology Generation**: Auto-generate network diagrams from devices and connections
  - Node creation from devices and standalone devices
  - Edge creation from connections and topology connections
  - Layer categorization (core, distribution, access, endpoint)
  - Auto-layout with hierarchical positioning
- **Topology Utilities** (`src/utils/networkTopology.ts`):
  - `generateNetworkTopology()`: Create topology from devices/connections
  - `autoLayoutTopology()`: Hierarchical layout algorithm
  - `findPath()`: Shortest path between devices
  - `detectLoops()`: Network loop detection
  - `findIsolatedDevices()`: Find disconnected devices
  - `getTopologyStats()`: Network statistics
  - `generateMermaidDiagram()`: Mermaid.js syntax export
  - `exportTopologyAsSVG()`: SVG diagram export
- **Network Analysis**:
  - Device categorization into network layers
  - Path finding between any two devices
  - Loop/cycle detection for troubleshooting
  - Isolated device identification
  - Connection type statistics
  - Device type distribution

# RackSmith v0.3.10
**Port Connection Management System**:
- **Cable Routing**: Visual cable path calculation and validation
  - L-shaped routing algorithm
  - Cable length calculation with slack
  - Color-coded cables by type (Cat6=Blue, Fiber=Cyan, etc.)
  - Path validation with warnings
- **Port Utilities** (`src/utils/portConnectionManager.ts`):
  - `calculateCableRoute()`: Generate cable routing paths
  - `calculatePortUtilization()`: Track port usage statistics
  - `findAvailablePorts()`: Search for free ports
  - `validatePortCompatibility()`: Check port/cable compatibility
  - `generatePortMappingDoc()`: Documentation export
  - `generateCableLabels()`: Auto-generate cable labels
  - `detectConnectionLoops()`: Find network loops
  - `generateCableBOM()`: Bill of materials
  - `suggestCableType()`: Recommend optimal cable
- **Connection Validation**:
  - Cable length limits by type (Cat6: 328ft, Fiber OM4: 1312ft, DAC: 16ft)
  - Port type compatibility checking
  - Speed mismatch warnings
  - Power cable voltage drop warnings

# RackSmith v0.3.9
**VLAN Setup Wizard**:
- **VLAN Templates**: 3 predefined configurations
  - Small Business (Management, Data, Guest)
  - Enterprise (Management, Data, Voice, Guest, DMZ)
  - Data Center (Management, Production, Storage, Backup, vMotion)
- **VLAN Utilities** (`src/utils/vlanWizard.ts`):
  - `getVLANTemplates()`: Retrieve all templates
  - `getVLANTemplateById()`: Get specific template
  - `applyVLANTemplate()`: Create VLAN configuration
  - `validateVLANId()`: Validate VLAN ID (1-4094)
  - `checkVLANConflicts()`: Detect ID/name conflicts
  - `generateCiscoVLANConfig()`: Cisco IOS syntax
  - `generateArubaVLANConfig()`: HP/Aruba syntax
  - `generateVLANDocumentation()`: Markdown docs
  - `recommendVLANScheme()`: Auto-recommendations
  - `autoAssignDevicesToVLANs()`: Smart device assignment
- **Configuration Export**:
  - Cisco IOS switch configuration
  - HP/Aruba switch configuration
  - Comprehensive markdown documentation
  - Auto-assignment based on device types

# RackSmith v0.3.8
**IP Scheme Auto-Generator**:
- **Subnet Calculation**: Complete subnet mathematics
  - Network/broadcast address calculation
  - CIDR to subnet mask conversion
  - Usable IP range calculation
  - Host count calculation
- **IP Utilities** (`src/utils/ipSchemeGenerator.ts`):
  - `calculateSubnet()`: Full subnet details
  - `cidrToMask()` / `maskToCidr()`: CIDR conversions
  - `generateSubnetPlan()`: Multi-VLAN subnet allocation
  - `autoAllocateIPs()`: Auto-assign IPs to devices
  - `isIPInSubnet()`: Subnet membership check
  - `getNextAvailableIP()`: Find next free IP
  - `generateAllocationTable()`: Markdown documentation
  - `generateReverseDNS()`: PTR record generation
  - `calculateVLSM()`: Variable Length Subnet Masking
- **IP Allocation Features**:
  - Auto-gateway reservation
  - Device-based IP assignment
  - Purpose-based allocation (management, data, storage, backup)
  - VLAN integration
  - Overflow handling for large subnets

# RackSmith v0.3.7
**Rack Templates System**:
- **Predefined Templates**: 4 professional rack configurations
  - Network Core - 42U (redundant routers, switches, UPS)
  - Compute Cluster - 42U (8-server high-density cluster)
  - Storage NAS - 42U (redundant controllers with disk shelves)
  - Edge Networking - 24U (firewall, switches, patch panel)
- **Template Utilities** (`src/utils/rackTemplates.ts`):
  - `getTemplates()`: Retrieve all available templates
  - `getTemplateById()`: Get specific template by ID
  - `getTemplatesByCategory()`: Filter templates by category
  - `applyTemplate()`: Create rack and devices from template
  - `createTemplateFromRack()`: Save existing rack as template
  - `validateTemplate()`: Check template compatibility
  - `getTemplateStats()`: Calculate utilization and power stats
- **Template Features**:
  - Device collision detection
  - Rack size validation
  - Category organization (networking, compute, storage, mixed, custom)
  - Tag system for filtering
  - Statistics calculation (utilization %, power consumption, device count)
  - Custom template creation from existing racks

**Template Categories**:
- Networking: Core infrastructure with redundancy
- Compute: High-density server clusters
- Storage: NAS and SAN configurations
- Mixed: Hybrid workload templates
- Custom: User-created templates

**Template Validation**:
- Rack size compatibility checking
- Device position validation
- Collision detection across all devices
- Automatic stats calculation for informed decisions

# RackSmith v0.3.6
**Advanced Search & Filtering System**:
- **Global Search Component**: Cmd+K/Ctrl+K keyboard shortcut
  - Search across racks, devices, network tools, and pages
  - Real-time search results with type indicators
  - Keyboard navigation (arrow keys, enter, escape)
  - Click-outside-to-close functionality
  - Result limit of 10 items for performance
  - Visual icons and metadata for each result type
- **Search Utilities** (`src/utils/searchFilters.ts`):
  - `filterRacks()`: Filter racks by size, color tag, location
  - `filterDevices()`: Filter devices by type, manufacturer, size, ports
  - `searchRacks()`: Full-text search across rack properties
  - `searchDevices()`: Full-text search across device properties
  - `searchAndFilterRacks()`: Combined search and filter operations
  - `searchAndFilterDevices()`: Combined search and filter for devices
  - `getUniqueDeviceTypes()`: Extract unique device types
  - `getUniqueManufacturers()`: Extract unique manufacturers
  - `getUniqueColorTags()`: Extract unique color tags
  - `getUniqueLocations()`: Extract unique locations
  - `sortRacks()`: Sort by name, size, location, date
  - `sortDevices()`: Sort by name, type, manufacturer, size, position
- **Global Search UI** (`src/components/ui/global-search.tsx`):
  - Modal overlay with glass-morphism design
  - Search input with clear button
  - Keyboard shortcuts helper in footer
  - Result type badges (rack, device, network-tool, page)
  - Empty state with helpful hints
  - No results state with suggestions

**Search Features**:
- Multi-criteria filtering with range support (min/max)
- Case-insensitive search across all text fields
- Sort by multiple criteria with ascending/descending order
- Helper functions to extract unique filter values
- Integration ready for all pages (Dashboard, Racks, Device Library)

# RackSmith v0.3.5
**Bulk Operations System**:
- **CSV Device Import**: Import multiple devices from CSV files
  - Template generation with example data
  - Comprehensive validation (device types, sizes, ports, IPs)
  - Real-time error reporting with line numbers
  - Support for all device properties
- **Batch Device Creation**: Create multiple devices at once
  - Progress tracking during batch operations
  - Individual error handling per device
  - Success/failure reporting
- **Import Utilities**: Full set of bulk operation tools in `src/utils/bulkOperations.ts`
  - `parseDeviceCSV()`: Parse and validate CSV content
  - `convertCSVToDevices()`: Convert CSV to Device objects
  - `importDevicesFromCSV()`: Handle file upload and processing
  - `generateCSVTemplate()`: Create import template
  - `downloadCSVTemplate()`: Download template file
  - `batchCreateDevices()`: Batch API operations
  - `showBulkImportResults()`: Toast notifications for results
  - `generateCSVFromDevices()`: Export devices as CSV template

**CSV Validation Features**:
- Required field checking (name, manufacturer, device_type, size_u)
- Device type validation against allowed types
- Numeric field validation (size, power, ports)
- IP address validation for management IPs
- Position validation with collision detection
- Integration with existing validation utilities

# RackSmith v0.3.4
**Enhanced Rack Visualizer**:
- **Rack Utilization Display**: Real-time capacity monitoring
  - Live U-unit usage tracking (e.g., "24U / 42U used")
  - Warning indicators at 80%+ capacity with AlertTriangle icon
  - Percentage and absolute values shown in header
- **Enhanced Validation Integration**: Comprehensive placement checking
  - Real-time collision detection using validation utilities
  - Clear error messages for invalid placements
  - Position boundary validation
  - Visual feedback for validation errors
- **Improved Drag Feedback**: Better user experience
  - Error toast notifications for failed drops
  - Success notifications with position info
  - Persistent validation error display in header
  - Enhanced visual states (drop targets, dragging)
- **Validation Error Panel**: Inline error display
  - Red warning banner with AlertTriangle icon
  - Clear error message text
  - Automatic dismissal on successful drop
  - Non-intrusive placement in card header

**Technical Improvements**:
- Integrated `validateDevicePlacement()` from validators utility
- Integrated `calculateRackUtilization()` for capacity tracking
- Added toast notifications for user feedback
- Improved TypeScript type safety for drag events
- Enhanced visual feedback with utilization warnings

# RackSmith v0.3.3
**Data Export/Import System**:
- **Complete data export and import functionality**
  - Export individual racks as JSON or CSV
  - Export all racks with devices
  - Export device library as CSV
  - Generate text-based ASCII rack diagrams
  - Import rack configurations from JSON
  - Automatic file naming with timestamps
  - Summary metadata in exports
- **Added export buttons to Racks page**
  - Export JSON and Export CSV buttons
  - Toast notifications for successful exports
  - Smart file naming: `rack_{name}_{date}.json`

**Technical Additions**:
- Created `src/utils/exportUtils.ts` with 9 export/import functions
- Added download utilities for browser file downloads
- CSV and JSON serialization for rack/device data

# RackSmith v0.3.2
**Real-time Validation System**:
- **Comprehensive validation utilities** (`src/utils/validators.ts`)
  - Device placement validation with collision detection
  - Rack capacity validation with utilization warnings (75%, 90%, 100%)
  - Port configuration validation (duplicate detection)
  - IP address format and conflict validation
  - Subnet mask validation (all standard masks)
  - VLAN ID validation (1-4094 range)
  - Private IP range detection

**Validation Functions**:
- `validateDevicePlacement()` - Collision detection and bounds checking
- `validateRackCapacity()` - Capacity warnings and power monitoring
- `calculateRackUtilization()` - Utilization calculations
- `validatePortConfiguration()` - Duplicate port detection
- `validateIPAddress()` - IPv4 format validation
- `validateSubnetMask()` - Standard mask validation
- `validateIPConflicts()` - Duplicate IP prevention
- `validateVLANId()` - VLAN range validation

**Use Cases**:
- Prevent device placement conflicts in rack builder
- Warn about approaching capacity limits
- Validate network configurations in network tools
- Ensure data integrity across the application

# RackSmith v0.3.1
**Dashboard Quick Actions**:
- **Enhanced dashboard with rack management capabilities**
  - Added quick action buttons (Add Device, New Rack) to header
  - Added edit/delete buttons to rack cards
  - View, edit, or delete racks directly from dashboard
  - Auto-refresh stats after rack deletion

**Improvements**:
- Streamlined workflow - no need to navigate away for basic operations
- Delete confirmation dialogs
- Real-time stat updates after operations
- Better user experience with immediate feedback

# RackSmith v0.3.0
**Device Library - Full CRUD Operations**:
- **Complete Create, Read, Update, Delete functionality for custom devices**
  - Create custom devices with full validation
  - Edit existing custom devices
  - Delete custom devices with confirmation
  - Real-time API integration with toast notifications
  - Improved CustomDeviceDialog component with proper state management

**Configuration Updates**:
- Centralized version management - now auto-imported from package.json
- Added environment configuration utility (`src/config/env.ts`) with dev/prod mode helpers
- Updated Vite config to expose custom env vars without prefix requirement
- Footer component now uses centralized config for automatic version display

**Backend Preparation**:
- Created comprehensive API requirements documentation for backend integration
- Implemented environment-based authentication system (dev mode bypasses auth, prod enforces)
- Updated AuthContext to support both mock data (dev) and real API calls (prod)
- Configured CORS requirements and JWT token system specifications

# RackSmith v0.2.11
**Page Updates**:
- Added and implemented '404 Not Found' Page that'll appear at any undefined route (instead of just defaulting back to /dashboard).

# RackSmith v0.2.10
**UI Updates**:
- Added and implemented 'Sign Out' button (located in the main sidebar).
- Added Footer component that's shown across the entire app (including auth pages).
- Enchaced the overall 'glass effect'.
- Updated UI components to use more of the glassmorphic design I like.

**General Updates**:
- Added ROADMAP file for my own development reference.
- Added docs directory and moved CHANGELOG and ROADMAP to it.

# RackSmith v0.2.9
**Floor Plan Page Updates**:
- Fixed no data loading on page mount.
- Fixed navigation bug when clicking devices.
- Fixed grid section cutting off.
- Added comprehensive JSDoc comments (courtesy of copilot).

**UI Updates**:
- Updated some button styles that weren't consistent (some had icons or text that was black when it should be white).

**General Updates**:
- Updated README to look more profesionally done (most of it courtesy of copilot).

# RackSmith v0.2.8
- More code cleanup and organization for the recently editted files.
- (I plan on cleaning all files later).
- Went through and updated/added comments.
- This patch was more completed using AI to generate the JSdoc comments and to word things better and faster.
- Harder Better Faster Stronger.

# RackSmith v0.2.7
- Updated the mock data and api cause there was a lot of dupe data.
- Fixed card padding with Login and Register pages.
- Fixed card padding with RackDetails page.
- Went back and fixed the Sidebar z issues with both the menu and devices sidebars.

# RackSmith v0.2.6
- Added DeviceDetailsModal component.

# RackSmith v0.2.5
- Overall code and comment cleanup.
- Migrated things to their respective type files.

# RackSmith v0.2.0-v0.2.4
Major Features:
- Visual rack builder with U-position display and device placement.
- Drag-and-drop device installation with water drop ripple effect.
- Bottom-up rack positioning with visual preview highlighting.
- Modern SVG device graphics with gradient styling.
- Blue/purple color palette across all device types.
- Polished Racks page with better card layout.
- Refined NetworkTools with consistent styling.
- Updated Dashboard, DeviceLibrary, and DeviceOptions pages with updated components.

UI Updates:
- Enhanced glassmorphism design with gradient backgrounds.
- Improved component alignment and spacing.
- Visual stuff for drag operations.

Component Updates:
- Redesigned Layout with enhanced sidebar styling.
- Updated RackVisualizer with device graphics and drag-drop.
- Improved DevicePalette with search and drag support.
- Fixed Select component with proper dropdown icons.
- Fixed alignment issues with Card and Skeleton components.

Technical Improvements:
- Fixed rack unit positioning logic (bottom-up).
- State management for drag operations.

# RackSmith v0.0.2-v0.1.3
- Added pages, component, and overall structure from AI tool.
- Added api and mockData to simulate things for now.
- Started auth shtuff.
- Overall cleanup.

# RackSmith v0.0.1
- Initial files for setup.