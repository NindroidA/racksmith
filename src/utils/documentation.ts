/**
 * In-App Documentation Utilities
 * Context-sensitive help, tooltips, and guided tours
 */

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  content: string;
  keywords: string[];
  relatedArticles?: string[];
  lastUpdated: Date;
  views?: number;
}

export type HelpCategory =
  | 'getting_started'
  | 'rack_management'
  | 'device_management'
  | 'network_planning'
  | 'floor_plans'
  | 'connections'
  | 'advanced_features'
  | 'troubleshooting';

export interface Tooltip {
  id: string;
  element: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
}

export interface GuidedTour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
  category: HelpCategory;
  estimatedMinutes: number;
  completed?: boolean;
}

export interface TourStep {
  id: string;
  title: string;
  content: string;
  element?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'type' | 'observe';
  nextButton?: string;
  previousButton?: string;
}

/**
 * Help articles database
 */
export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started-overview',
    title: 'Getting Started with RackSmith',
    category: 'getting_started',
    content: `
# Welcome to RackSmith!

RackSmith is a comprehensive rack and network planning tool that helps you:
- Design and visualize server racks
- Plan network topologies
- Manage device connections
- Track power usage and capacity

## Quick Start
1. Create your first rack from the Dashboard
2. Add devices from the Device Library
3. Configure connections between devices
4. Export and share your configurations

## Key Features
- **Visual Rack Builder**: Drag-and-drop interface for rack design
- **Floor Plan Editor**: Plan entire data center layouts
- **Network Tools**: Subnet calculator, VLAN configurator, and more
- **Cable Management**: Track and label all your cables
- **Advanced Search**: Find devices and configurations quickly
    `.trim(),
    keywords: ['getting started', 'overview', 'introduction', 'quick start'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'create-rack',
    title: 'How to Create a Rack',
    category: 'rack_management',
    content: `
# Creating a New Rack

## Steps to Create a Rack
1. Navigate to the Dashboard or Racks page
2. Click the "Create New Rack" button
3. Enter a name for your rack (e.g., "Production Rack 1")
4. Select the rack size (standard sizes: 42U, 45U, or custom)
5. Choose a color tag for easy identification
6. Add optional location and description
7. Click "Create" to save

## Best Practices
- Use descriptive names that include location (e.g., "DC1-Row3-Rack05")
- Pick consistent color tags for different environments (blue for production, orange for staging)
- Document the physical location in the location field
- Add notes about power circuits, network uplinks, etc.

## Tips
- You can clone existing racks to save time
- Use templates for standardized rack configurations
- The color tag helps quickly identify racks in floor plans
    `.trim(),
    keywords: ['create rack', 'new rack', 'rack setup', 'rack configuration'],
    relatedArticles: ['add-device', 'rack-templates'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'add-device',
    title: 'Adding Devices to Racks',
    category: 'device_management',
    content: `
# Adding Devices to Your Rack

## Using the Device Library
1. Open your rack in the Rack Builder
2. Browse the Device Library on the left
3. Select a device category (Router, Switch, Server, etc.)
4. Drag the device onto the rack
5. Position it at the desired U position

## Device Properties
- **Name**: Give the device a unique identifier
- **Model**: Specify the exact model number
- **Size**: Devices come in standard sizes (1U, 2U, 4U, etc.)
- **Power**: Track power consumption in watts
- **Ports**: Define the number of network ports

## Custom Devices
If your device isn't in the library:
1. Navigate to Device Library page
2. Click "Create Custom Device"
3. Fill in the device specifications
4. Save and use in any rack

## Tips
- Leave 1U spacing between devices for airflow
- Place heavier devices at the bottom of the rack
- Group related devices together
- Use the auto-arrange feature to optimize spacing
    `.trim(),
    keywords: ['add device', 'device library', 'rack device', 'custom device'],
    relatedArticles: ['create-rack', 'device-connections'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'device-connections',
    title: 'Managing Device Connections',
    category: 'connections',
    content: `
# Creating and Managing Connections

## Creating Connections
1. Open a rack with multiple devices
2. Click on a device to view available ports
3. Select "Create Connection"
4. Choose the destination device and port
5. Select cable type (Cat6, Fiber, SFP+, etc.)
6. Add optional details (VLAN, description, cable length)

## Cable Types
- **Cat5e/Cat6/Cat6a**: Ethernet cables for different speeds
- **Fiber (OM3/OM4/SM)**: For long distances or high bandwidth
- **SFP/SFP+/QSFP**: Transceiver connections
- **DAC**: Direct Attach Copper for short runs
- **Power**: Power distribution connections

## Connection Management
- View all connections in the Connection Manager
- Filter by cable type, VLAN, or device
- Use cable labels for physical identification
- Export connection diagrams

## Best Practices
- Document VLAN assignments for network ports
- Label cables with source and destination
- Use color coding for different cable types
- Plan cable paths to avoid congestion
    `.trim(),
    keywords: ['connections', 'cables', 'network', 'ports', 'wiring'],
    relatedArticles: ['add-device', 'cable-management'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'floor-plans',
    title: 'Creating Floor Plans',
    category: 'floor_plans',
    content: `
# Floor Plan Editor

## Overview
The Floor Plan Editor allows you to visualize entire data center layouts with multiple racks and standalone devices.

## Creating a Floor Plan
1. Navigate to Floor Plan page
2. Add racks by clicking "Add Rack to Floor Plan"
3. Position racks by dragging them
4. Add standalone devices (routers, switches, patch panels)
5. Create connections between devices
6. Save your layout

## Multi-Floor Support
- Create multiple floors for building layouts
- Link devices between floors
- View inter-floor connections
- Calculate cable paths across floors

## Standalone Devices
Add non-rack devices like:
- ISP connection points
- Wall-mounted switches
- Access points
- Cameras and door controllers
- Patch panels

## Tips
- Use grid snap for alignment
- Group related racks together
- Label racks with location identifiers
- Export floor plans for documentation
    `.trim(),
    keywords: ['floor plan', 'layout', 'data center', 'topology', 'visualization'],
    relatedArticles: ['create-rack', 'network-topology'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'network-tools',
    title: 'Network Planning Tools',
    category: 'network_planning',
    content: `
# Network Planning Tools

RackSmith includes several network planning utilities:

## Subnet Calculator
- Calculate subnet masks and IP ranges
- Plan CIDR blocks
- Determine usable hosts
- View network and broadcast addresses

## VLAN Configurator
- Design VLAN schemes
- Assign VLANs to ports
- Document VLAN purposes
- Export VLAN configurations

## IP Address Planner
- Plan IP address allocation
- Track IP assignments
- Avoid IP conflicts
- Export IP documentation

## Network Builder
- Design network topologies
- Plan redundancy
- Calculate bandwidth requirements
- Visualize network architecture

## NAS Builder
- Configure RAID arrays
- Calculate storage capacity
- Estimate rebuild times
- Plan for redundancy

## Tips
- Document your IP schemes before implementation
- Use consistent VLAN numbering across sites
- Plan for growth in your subnets
- Test configurations before deployment
    `.trim(),
    keywords: ['network', 'subnet', 'vlan', 'ip address', 'planning', 'calculator'],
    relatedArticles: ['device-connections', 'advanced-search'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'advanced_features',
    content: `
# Keyboard Shortcuts

## Global Shortcuts
- \`Ctrl/Cmd + K\`: Open command palette
- \`Ctrl/Cmd + /\`: Open search
- \`Ctrl/Cmd + S\`: Save current configuration
- \`Ctrl/Cmd + N\`: Create new rack
- \`Ctrl/Cmd + F\`: Find in current page
- \`Esc\`: Close dialogs/modals

## Rack Builder
- \`Delete\`: Remove selected device
- \`Ctrl/Cmd + D\`: Duplicate selected device
- \`Ctrl/Cmd + Z\`: Undo last action
- \`Ctrl/Cmd + Shift + Z\`: Redo
- \`Arrow Keys\`: Move selected device
- \`Shift + Arrow Keys\`: Move device by 1U

## Navigation
- \`Alt + 1-9\`: Quick navigate to pages
- \`Ctrl/Cmd + B\`: Toggle sidebar
- \`Ctrl/Cmd + ,\`: Open preferences

## Floor Plan
- \`G\`: Toggle grid
- \`R\`: Rotate selected item
- \`Ctrl/Cmd + G\`: Group selected items
- \`Space + Drag\`: Pan view
- \`Ctrl/Cmd + Scroll\`: Zoom in/out

## Tips
- Customize shortcuts in Preferences
- View all shortcuts with \`?\` key
- Shortcuts work in their respective pages
    `.trim(),
    keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands', 'quick access'],
    relatedArticles: ['getting-started-overview', 'preferences'],
    lastUpdated: new Date(),
    views: 0,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    category: 'troubleshooting',
    content: `
# Troubleshooting Guide

## Common Issues and Solutions

### Devices Won't Add to Rack
**Problem**: Can't add device to rack position
**Solutions**:
- Check if position is occupied
- Verify device fits (doesn't exceed rack size)
- Ensure sufficient space above/below
- Try using the auto-arrange feature

### Connections Not Saving
**Problem**: Connections disappear after creation
**Solutions**:
- Verify both devices have available ports
- Check that devices are in the same context (rack/floor plan)
- Ensure ports aren't already connected
- Save the rack before creating connections

### Floor Plan Layout Issues
**Problem**: Devices overlap or misalign
**Solutions**:
- Enable grid snap for alignment
- Use the align tools in the toolbar
- Check zoom level (may appear overlapped when zoomed out)
- Reset view to default

### Search Not Finding Items
**Problem**: Known devices don't appear in search
**Solutions**:
- Check spelling and try partial matches
- Use advanced search filters
- Verify item hasn't been deleted
- Clear search cache in preferences

### Performance Issues
**Problem**: Application runs slowly
**Solutions**:
- Close unused tabs/pages
- Clear browser cache
- Reduce number of devices in single rack
- Use compact view mode
- Export and archive old configurations

## Getting More Help
- Check the documentation for detailed guides
- Use the feedback form to report bugs
- Visit our community forum for discussions
    `.trim(),
    keywords: ['troubleshooting', 'problems', 'issues', 'help', 'errors', 'bugs'],
    relatedArticles: ['getting-started-overview', 'add-device', 'floor-plans'],
    lastUpdated: new Date(),
    views: 0,
  },
];

/**
 * Search help articles
 */
export function searchHelpArticles(query: string): HelpArticle[] {
  const lowerQuery = query.toLowerCase();

  return HELP_ARTICLES.filter((article) => {
    const titleMatch = article.title.toLowerCase().includes(lowerQuery);
    const keywordMatch = article.keywords.some((kw) =>
      kw.toLowerCase().includes(lowerQuery)
    );
    const contentMatch = article.content.toLowerCase().includes(lowerQuery);

    return titleMatch || keywordMatch || contentMatch;
  }).sort((a, b) => {
    // Prioritize title matches
    const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
    const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
    if (aTitle !== bTitle) return bTitle - aTitle;

    // Then by views
    return (b.views || 0) - (a.views || 0);
  });
}

/**
 * Get articles by category
 */
export function getArticlesByCategory(
  category: HelpCategory
): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category);
}

/**
 * Get article by ID
 */
export function getArticleById(id: string): HelpArticle | null {
  return HELP_ARTICLES.find((article) => article.id === id) || null;
}

/**
 * Increment article view count
 */
export function trackArticleView(articleId: string): void {
  const article = HELP_ARTICLES.find((a) => a.id === articleId);
  if (article) {
    article.views = (article.views || 0) + 1;
  }
}

/**
 * Get related articles
 */
export function getRelatedArticles(articleId: string): HelpArticle[] {
  const article = getArticleById(articleId);
  if (!article || !article.relatedArticles) return [];

  return article.relatedArticles
    .map((id) => getArticleById(id))
    .filter((a): a is HelpArticle => a !== null);
}

/**
 * Get popular articles
 */
export function getPopularArticles(limit: number = 5): HelpArticle[] {
  return [...HELP_ARTICLES]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);
}

/**
 * Guided tours
 */
export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'first-rack-tour',
    title: 'Create Your First Rack',
    description: 'Learn how to create and configure your first server rack',
    category: 'getting_started',
    estimatedMinutes: 5,
    steps: [
      {
        id: 'step-1',
        title: 'Welcome!',
        content:
          "Let's create your first server rack. This tour will guide you through the process step by step.",
        position: 'center',
        nextButton: 'Get Started',
      },
      {
        id: 'step-2',
        title: 'Navigate to Dashboard',
        content:
          'Click on the Dashboard link in the sidebar to view your racks.',
        element: '[data-tour="dashboard-link"]',
        position: 'right',
        action: 'click',
      },
      {
        id: 'step-3',
        title: 'Create New Rack',
        content:
          'Click the "Create New Rack" button to start building your first rack.',
        element: '[data-tour="create-rack-button"]',
        position: 'bottom',
        action: 'click',
      },
      {
        id: 'step-4',
        title: 'Name Your Rack',
        content:
          'Give your rack a descriptive name like "Production Rack 1" or "DC1-Row3-Rack05".',
        element: '[data-tour="rack-name-input"]',
        position: 'right',
        action: 'type',
      },
      {
        id: 'step-5',
        title: 'Choose Rack Size',
        content:
          'Select the rack size. 42U is the most common size for data centers.',
        element: '[data-tour="rack-size-select"]',
        position: 'right',
        action: 'click',
      },
      {
        id: 'step-6',
        title: 'Pick a Color Tag',
        content:
          'Choose a color tag for easy identification. For example, use blue for production racks.',
        element: '[data-tour="color-tag-select"]',
        position: 'right',
      },
      {
        id: 'step-7',
        title: 'Save Your Rack',
        content:
          'Click "Create" to save your rack. You can now start adding devices!',
        element: '[data-tour="create-button"]',
        position: 'top',
        action: 'click',
      },
      {
        id: 'step-8',
        title: 'Tour Complete!',
        content:
          "Great job! You've created your first rack. Next, try adding some devices from the Device Library.",
        position: 'center',
        nextButton: 'Finish',
      },
    ],
  },
  {
    id: 'add-devices-tour',
    title: 'Add Devices to Your Rack',
    description: 'Learn how to add and configure devices in your rack',
    category: 'device_management',
    estimatedMinutes: 7,
    steps: [
      {
        id: 'step-1',
        title: 'Adding Devices',
        content:
          "Now that you have a rack, let's add some devices to it.",
        position: 'center',
      },
      {
        id: 'step-2',
        title: 'Open Rack Builder',
        content: 'Click on your rack to open the Rack Builder view.',
        element: '[data-tour="rack-card"]',
        position: 'top',
        action: 'click',
      },
      {
        id: 'step-3',
        title: 'Device Library',
        content:
          'The Device Library on the left shows all available devices. Browse by category.',
        element: '[data-tour="device-library"]',
        position: 'right',
      },
      {
        id: 'step-4',
        title: 'Select a Device',
        content:
          "Let's add a switch. Click on the Switches category and select a device.",
        element: '[data-tour="device-category-switch"]',
        position: 'right',
        action: 'click',
      },
      {
        id: 'step-5',
        title: 'Drag to Rack',
        content:
          'Drag the device from the library onto the rack at your desired position.',
        element: '[data-tour="rack-visualizer"]',
        position: 'left',
        action: 'observe',
      },
      {
        id: 'step-6',
        title: 'Configure Device',
        content:
          'Edit the device properties like name, model, and power consumption in the properties panel.',
        element: '[data-tour="device-properties"]',
        position: 'left',
      },
      {
        id: 'step-7',
        title: 'Add More Devices',
        content:
          'Continue adding devices. Try adding a router, server, and UPS to complete your setup.',
        position: 'center',
      },
      {
        id: 'step-8',
        title: 'Tour Complete!',
        content:
          "Excellent! You've learned how to add devices. Next, explore creating connections between devices.",
        position: 'center',
        nextButton: 'Finish',
      },
    ],
  },
];

/**
 * Get tour by ID
 */
export function getTourById(id: string): GuidedTour | null {
  return GUIDED_TOURS.find((tour) => tour.id === id) || null;
}

/**
 * Mark tour as completed
 */
export function completeTour(tourId: string): void {
  const completedTours = getCompletedTours();
  if (!completedTours.includes(tourId)) {
    completedTours.push(tourId);
    localStorage.setItem('completed_tours', JSON.stringify(completedTours));
  }
}

/**
 * Get completed tours
 */
export function getCompletedTours(): string[] {
  try {
    const stored = localStorage.getItem('completed_tours');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get available tours (not completed)
 */
export function getAvailableTours(): GuidedTour[] {
  const completed = getCompletedTours();
  return GUIDED_TOURS.filter((tour) => !completed.includes(tour.id));
}

/**
 * Get context-sensitive help
 */
export function getContextHelp(context: string): HelpArticle | null {
  const contextMap: Record<string, string> = {
    dashboard: 'getting-started-overview',
    'rack-builder': 'add-device',
    'floor-plan': 'floor-plans',
    'device-library': 'add-device',
    'network-tools': 'network-tools',
    connections: 'device-connections',
  };

  const articleId = contextMap[context];
  return articleId ? getArticleById(articleId) : null;
}

/**
 * Generate tooltip configuration
 */
export function generateTooltips(): Tooltip[] {
  return [
    {
      id: 'rack-size',
      element: '[data-tooltip="rack-size"]',
      text: 'Standard rack sizes are 42U, 45U, or 48U. 1U = 1.75 inches.',
      position: 'right',
      trigger: 'hover',
    },
    {
      id: 'power-usage',
      element: '[data-tooltip="power-usage"]',
      text: 'Total power consumption of all devices in watts. Plan for 80% of circuit capacity.',
      position: 'top',
      trigger: 'hover',
    },
    {
      id: 'color-tag',
      element: '[data-tooltip="color-tag"]',
      text: 'Use color tags to categorize racks (e.g., blue=production, orange=staging).',
      position: 'right',
      trigger: 'hover',
    },
    {
      id: 'device-u-size',
      element: '[data-tooltip="device-u-size"]',
      text: 'Device height in rack units (U). Common sizes: 1U, 2U, 4U.',
      position: 'right',
      trigger: 'hover',
    },
    {
      id: 'cable-type',
      element: '[data-tooltip="cable-type"]',
      text: 'Select appropriate cable: Cat6 for 1-10G, Fiber for long runs or >10G.',
      position: 'top',
      trigger: 'hover',
    },
  ];
}
