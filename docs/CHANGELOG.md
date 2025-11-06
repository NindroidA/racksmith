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