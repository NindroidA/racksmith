# RackSmith v0.4.0 🎉
This release marks the completion of all high-priority core functionality. The application now has comprehensive tools for rack design, network planning, and infrastructure management.

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