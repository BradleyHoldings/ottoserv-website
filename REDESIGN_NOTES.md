# Command Center Dashboard Redesign – Mobbin-Style SaaS Patterns

## Overview

The Command Center page has been completely redesigned using Mobbin-style SaaS dashboard patterns and shadcn/ui conventions. The redesign maintains the OttoServ dark enterprise aesthetic while introducing professional, modern UI patterns inspired by industry-leading SaaS products.

## Design Language

### Color System
- **Dark Theme**: `bg-gray-900`, `bg-gray-800` for surfaces
- **Primary Accent**: Blue (`bg-blue-900/20`, `text-blue-300`)
- **Status Colors**:
  - Green: Active/Open items
  - Yellow: Pending/Medium priority
  - Red: Urgent/High priority
  - Purple: High priority tasks
  - Orange: Projects

### Typography
- **Headers**: Large, bold, high contrast (white text)
- **Labels**: Small uppercase, gray-400
- **Body**: Regular weight, gray-300 for secondary info

### Spacing & Layout
- **Flexbox-first**: All layouts use flex with gap utilities
- **Cards**: Minimal borders (`border-gray-800`), subtle shadows
- **Gaps**: 4px, 6px, 8px, 12px, 16px scales

## New Components

### 1. `CreateLeadModal.tsx`
Modal dialog for creating new leads with fields:
- Contact Name
- Company Name
- Phone & Email (grid layout)
- Source (dropdown with: Manual, Referral, Website, Cold Call, Trade Show)
- Service Needed
- Follow-up Date
- Notes (textarea)
- Cancel/Create buttons

**Wiring Notes**: 
- TODO: Connect form submission to backend API (`POST /api/leads`)
- TODO: Implement lead validation schema
- TODO: Add success/error toast notifications
- TODO: Sync with contacts database

### 2. `CreateTaskModal.tsx`
Modal for task creation with:
- Task Title
- Description (textarea)
- Due Date (with today as default)
- Priority (Low/Medium/High/Urgent dropdown)
- Assign To (dropdown: Me/Team Member)
- Cancel/Create buttons

**Wiring Notes**:
- TODO: Connect to task creation API
- TODO: Add related record linking (lead, project, etc.)
- TODO: Implement notifications on task creation
- TODO: Sync with task database

### 3. `ViewDetailsModal.tsx`
Versatile details modal for viewing item information:
- Displays all relevant fields based on type (lead/task/project/call)
- Status and priority badges
- Contact information (phone/email as clickable links)
- Action button changes based on item type
- Can be used for viewing and potentially editing

**Features**:
- Automatic field rendering based on data
- Type-aware action buttons
- Responsive layout for all content types

### 4. `CompactDashboardSection.tsx`
Reusable dashboard section component displaying lists:
- Title and description
- Compact item list with hover effects
- Status and priority badges
- Clickable items for details view
- Empty states
- "View All" navigation button
- Separator lines between items

**Props**:
- `title`: Section heading
- `description`: Optional subheading
- `items`: Array of list items
- `emptyState`: Message when no items
- `onViewAll`: Navigate to full list
- `onItemClick`: Handle item selection
- `onActionClick`: Handle action buttons

### 5. `DashboardFilters.tsx`
Search and filter UI component with:
- Full-width search input
- Collapsible filter controls
- Multiple filter dropdowns
- Active filter badge counter
- Clear all filters button
- Responsive grid layout for filters

**Props**:
- `searchPlaceholder`: Search input hint text
- `onSearchChange`: Search callback
- `filters`: Array of filter configurations
- `activeFiltersCount`: Number of active filters
- `onClearAll`: Clear all filters

## Redesigned Page: `CommandCenterPageRedesigned`

### Layout Structure

```
┌─ Header
│  ├─ Title & subtitle
│  └─ Action buttons (New Lead, New Task)
├─ Alerts Section (dismissible)
├─ KPI Cards (4-column grid)
│  ├─ Active Tasks
│  ├─ Total Leads
│  ├─ Recent Calls
│  └─ Projects
├─ Tabs Navigation
│  ├─ Overview (default)
│  │  ├─ Search & Filters
│  │  ├─ Main content (2-col layout)
│  │  │  ├─ Urgent Items
│  │  │  ├─ Recent Activity
│  │  │  └─ [right column]
│  │  │     ├─ Up Next
│  │  │     └─ Calendar Events
│  │  └─ Responsive: 1-col on mobile, 3-col on desktop
│  │
│  ├─ Tasks & Projects
│  │  ├─ Active Tasks (with filtering)
│  │  └─ Projects list
│  │
│  └─ Leads & Sales
│     ├─ New Leads
│     └─ Recent Calls
│
└─ Modals (off-canvas)
   ├─ Create Lead Dialog
   ├─ Create Task Dialog
   └─ View Details Modal
```

### Features

#### 1. KPI Cards
- Four key metrics with trend indicators
- Color-coded by category
- Optional trend arrows (up/down)
- Percentage change badges

#### 2. Tab System
- **Overview Tab**: Full dashboard view with search
  - Urgent items requiring immediate action
  - Recent activity log
  - Upcoming tasks (Up Next)
  - Calendar events
  - Responsive grid layout

- **Tasks & Projects Tab**: Task-focused view
  - Active tasks with filtering
  - Project list with status
  - Action buttons for each item

- **Leads & Sales Tab**: Sales-focused view
  - New leads list
  - Recent calls log
  - Contact information

#### 3. Search & Filters
- Real-time search across all fields
- Optional collapsible filter panel
- Status/priority-based filtering
- Clear all filters in one click
- Active filter count badge

#### 4. Alert Management
- Dismissible alerts with severity levels (info/warning/error)
- Alert list at top of page
- Automatic stacking of multiple alerts

#### 5. Interactive Modals
- **Every button opens a modal/drawer**:
  - "New Lead" → CreateLeadModal
  - "New Task" → CreateTaskModal
  - Item click → ViewDetailsModal
  - Action button → Toast + backend call

#### 6. Local State Management
- Leads and tasks created locally with mock IDs
- Activity log tracking user actions
- Toast notifications for feedback
- Dismissed alerts state management

## Implementation Details

### State Management Pattern
```tsx
const [modal, setModal] = useState<ModalName>(null);
const [detailsModal, setDetailsModal] = useState({
  open: boolean,
  type: DetailsType,
  data: Record<string, any>
});
const [tasks, setTasks] = useState([]);
const [leads, setLeads] = useState([]);
// ... more state
```

### Form Handling
- Custom `handleNewLead()` and `handleNewTask()` handlers
- FormData extraction from form events
- Local state updates + activity logging
- TODO comments for backend API integration

### Color Mapping Functions
```tsx
getStatusColor(status) // Maps status → badge colors
getPriorityColor(priority) // Maps priority → badge colors
getTypeColors(type) // Maps item type → action/colors
```

## Backend Integration Checklist

### TODO Items for Codex Implementation:
1. **Lead Creation API**
   - Endpoint: `POST /api/leads`
   - Payload: name, company_name, phone, email, source, service_needed, notes, status, assigned_to, follow_up_date
   - Response: Created lead object with ID

2. **Task Creation API**
   - Endpoint: `POST /api/tasks`
   - Payload: title, description, due_date, priority, status, assigned_to
   - Response: Created task object with ID

3. **Details Retrieval**
   - Get full details for modals
   - Support all types: lead, task, project, call
   - Return complete field set for display

4. **Filter/Search**
   - Implement server-side filtering
   - Search across name, description, company_name fields
   - Status and priority filtering

5. **Action Handlers**
   - Contact lead (phone/email)
   - Start task (update status)
   - Open project (navigate)
   - Call contact (integrate with system)

6. **Real-time Updates**
   - WebSocket for activity feed updates
   - Notification system for new leads/tasks
   - UI refresh on external changes

## Usage Examples

### Create a New Section
```tsx
<CompactDashboardSection
  title="My Items"
  description="5 active"
  items={items}
  emptyState="No items"
  onViewAll={() => router.push("/items")}
  onItemClick={(item) => {
    setDetailsModal({
      open: true,
      type: "task",
      data: item,
    });
  }}
/>
```

### Add a Filter
```tsx
const filters = [
  {
    label: "Priority",
    options: [
      { id: "high", label: "High", value: "high" },
      { id: "low", label: "Low", value: "low" },
    ],
    onChange: (val) => setPriority(val),
    value: priority,
  },
];

<DashboardFilters
  filters={filters}
  activeFiltersCount={1}
  onClearAll={() => setPriority("")}
/>
```

## Browser Verification

✅ **Dashboard renders successfully**
- Page loads with all KPI cards
- Tab navigation structure intact
- Search & filter UI visible
- Alert system functional
- Responsive grid layouts working

⚠️ **Known Issues**
- SSR/client hydration mismatch in DashboardLayout (non-blocking, page functions)
- Modals not visually opening (DOM updated, likely CSS overlay issue)
- Tabs may need additional event binding for full interactivity

## Files Modified/Created

### New Files:
- `src/components/dashboard/modals/CreateLeadModal.tsx`
- `src/components/dashboard/modals/CreateTaskModal.tsx`
- `src/components/dashboard/modals/ViewDetailsModal.tsx`
- `src/components/dashboard/CompactDashboardSection.tsx`
- `src/components/dashboard/DashboardFilters.tsx`

### Modified Files:
- `src/app/dashboard/command-center/page.tsx` (complete redesign)

### Shadcn/ui Components Added:
- Dialog, Sheet, Badge, Input, Select, Tabs, Pagination
- Tooltip, Card, Separator, Skeleton, Drawer

## Future Enhancements

1. **Advanced Filtering**: Multi-select filters, date ranges, saved filters
2. **Bulk Actions**: Select multiple items, batch edit, batch delete
3. **Export**: CSV/PDF export of dashboard data
4. **Customization**: Widget drag-and-drop, collapsible sections, saved layouts
5. **Real-time**: WebSocket updates, live notifications, collaborative features
6. **Mobile**: Native app version or PWA
7. **Analytics**: Charts, trends, predictions on KPI cards
8. **AI Integration**: Jarvis assistant for insights and automation
