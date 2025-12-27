# Resizable Panels and Session History Feature Guide

## Overview

This document describes the new resizable panels and session history features added to the code generator environment.

## Features Implemented

### 1. Session History Panel

**Location**: Top-right corner of the Code Generator Chat (opaque, slightly visible)

**How to Use**:
- Click the history icon (clock icon) in the top-right corner of the chat header
- The session history panel will toggle open/closed
- View all previous sessions and their associated actions
- Expand each session to see individual actions with timestamps

**Key Components**:
- `SessionHistory.jsx` - Main component that displays session history
- Fetches from `/api/actions` endpoint with action history
- Shows incremental changes grouped by session
- Allows reverting to any previous action state

**Features**:
- Lists all sessions with timestamps
- Shows number of actions per session
- Displays individual actions with prompts and metadata
- One-click revert functionality for any action
- Auto-refreshes every 10 seconds
- Error handling for failed fetches

### 2. Resizable Panels

#### File Explorer and Code Editor (Horizontal Resize)

**How to Use**:
1. Locate the vertical divider between the File Explorer (left) and Code Editor (right)
2. The divider will be 1px thick, gray (#d1d5db), and highlighted in blue on hover
3. Click and drag the divider left/right to resize both panels
4. Minimum size: 15% of window width per panel
5. Panel sizes are maintained during the session

**Implementation**:
- Horizontal resizing managed by `panelSizes` state in RepoExplorer
- Mouse event handlers track drag position and calculate new percentages
- Prevents panels from becoming too small (minimum 15% each)

#### Chat Panel (Vertical Resize)

**How to Use**:
1. Click the "Show Chat" button in the file editor toolbar to open the chat panel at the bottom
2. Locate the horizontal divider between the code editor area and the chat panel
3. The divider will be 1px thick, gray, and highlighted in blue on hover
4. Click and drag upward to expand the chat panel
5. Drag downward to minimize it (minimum height: 150px)

**Implementation**:
- Vertical resizing managed by `chatPanelHeight` state
- Mouse handlers calculate new height based on vertical mouse movement
- Prevents chat panel from becoming too small (minimum 150px)

### 3. Action Tracking System

**How it Works**:
1. Every code generation action is tracked in the `/api/actions` endpoint
2. Actions include metadata like:
   - Prompt used for generation
   - Generated code
   - File path
   - Language detected
   - Timestamp
   - File snapshots for reverting

**Incremental Changes**:
- Each action is recorded as a "footstep" in your editing history
- File changes are captured at the time of action
- Complete file snapshots are stored for rollback functionality

**Revert Functionality**:
- Click the revert (rotate) icon next to any action in session history
- The system will restore files to their state at that action
- File explorer updates automatically
- Code editor content refreshes

## Components Structure

### New Components Created

1. **SessionHistory.jsx** (183 lines)
   - Fetches and displays session data
   - Groups actions by session
   - Provides revert functionality
   - Auto-refreshes history

2. **DraggableResizable.jsx** (161 lines)
   - Reusable wrapper for draggable and resizable components
   - Supports absolute positioning
   - Customizable min/max sizes
   - Can be extended for floating panels

3. **ResizableLayout.jsx** (98 lines)
   - Layout component for flexible panel resizing
   - Supports horizontal and vertical layouts
   - Drag handles between panels
   - Responsive sizing

### Modified Components

1. **CodeGeneratorChat.jsx**
   - Added session history toggle button
   - Integrated SessionHistory component
   - Fixed TypeScript syntax in JSX file
   - Added onActionRevert prop

2. **RepoExplorer.jsx**
   - Added horizontal panel resizing between file explorer and code editor
   - Added vertical chat panel resizing
   - Added state management for panel sizes
   - Integrated with CodeGeneratorChat props

## State Management

### RepoExplorer States

```javascript
const [panelSizes, setPanelSizes] = useState([25, 75]);
const [chatPanelHeight, setChatPanelHeight] = useState(300);
const [isDraggingDivider, setIsDraggingDivider] = useState(false);
const containerRef = useRef(null);
```

### CodeGeneratorChat States

```javascript
const [showSessionHistory, setShowSessionHistory] = useState(false);
// ... other existing states
```

### SessionHistory States

```javascript
const [sessions, setSessions] = useState([]);
const [expandedSessionId, setExpandedSessionId] = useState(null);
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);
const [reverting, setReverting] = useState(null);
```

## API Integration

### Endpoints Used

1. **GET /api/actions** (POST method)
   - `action: "getHistory"` - Fetch action history
   - `type: "sessions"` - Filter by sessions
   - Groups actions by session

2. **POST /api/actions**
   - `action: "revert"` - Revert to previous state
   - `actionId` - Action to revert to
   - Returns: `fileStates` object with file contents

## Usage Scenarios

### Scenario 1: Reviewing Previous Changes
1. Open the code generator chat
2. Click the history icon (📋) in top-right corner
3. Expand any session to see actions
4. Hover over action descriptions to see full context

### Scenario 2: Reverting to Previous State
1. Open session history
2. Click the rotate icon next to any action
3. Files will automatically revert to that state
4. Code editor updates to show reverted content

### Scenario 3: Adjusting Layout
1. **Expand code editor**: Drag the vertical divider right
2. **Expand file explorer**: Drag the vertical divider left
3. **Expand chat panel**: Drag the horizontal divider up
4. **Minimize chat panel**: Drag the horizontal divider down

## Technical Details

### Mouse Event Handling

**Horizontal Resize**:
```javascript
const handleMouseMove = (e) => {
  const containerWidth = container.offsetWidth;
  const newLeftWidth = (e.clientX - container.getBoundingClientRect().left) / containerWidth * 100;
  if (newLeftWidth > 15 && newLeftWidth < 85) {
    setPanelSizes([newLeftWidth, 100 - newLeftWidth]);
  }
};
```

**Vertical Resize**:
```javascript
const handleMouseMove = (moveEvent) => {
  const newHeight = Math.max(150, startHeight - (moveEvent.clientY - startY));
  setChatPanelHeight(newHeight);
};
```

### Data Flow

1. **Action Creation** → `/api/actions` endpoint
2. **History Fetch** → SessionHistory component
3. **Display** → Grouped by session with expandable details
4. **Revert** → `/api/actions` (revert action)
5. **Update** → FileCache and selected file content

## Browser Compatibility

- Works with modern browsers supporting:
  - Flexbox layout
  - Mouse events
  - React Hooks
  - ES6+ JavaScript

## Performance Considerations

1. **Auto-refresh**: Session history auto-refreshes every 10 seconds
2. **Lazy Loading**: Actions expanded only when needed
3. **Event Cleanup**: Mouse handlers properly removed on unmount
4. **State Updates**: Minimal re-renders with proper state management

## Future Enhancements

Potential improvements for future versions:

1. **Keyboard Shortcuts**: Add keyboard shortcuts for panel resize
2. **Persist Layout**: Save panel sizes to localStorage
3. **Keyboard Navigation**: Navigate history with arrow keys
4. **Diff View**: Show side-by-side diffs of changes
5. **Floating Windows**: Use DraggableResizable for floating panels
6. **Touch Support**: Add touch event handlers for mobile
7. **Undo/Redo**: Implement native undo/redo stack

## Troubleshooting

### Panel Won't Resize
- Ensure you're dragging from the exact divider position
- Check browser console for JavaScript errors
- Verify that parent container has proper height/width

### Session History Not Loading
- Check network tab for `/api/actions` requests
- Verify authentication token is being sent
- Ensure projectId is properly set

### Revert Not Working
- Check that action has proper `id` field
- Verify `/api/actions` endpoint supports revert action
- Look for error messages in browser console

## Support

For issues or questions about the resizable panels and session history features, please refer to the application logs or contact the development team.
