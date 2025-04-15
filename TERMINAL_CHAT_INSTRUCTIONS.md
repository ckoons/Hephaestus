# Terminal Chat Implementation Instructions

## Context and Background

This project involves implementing an AI terminal chat interface for the Tekton UI system. The current implementation has completed Phases 1 and 2, but there are issues with the message display functionality. Phase 3 implementation needs to be carefully handled with a focus on understanding the existing architecture rather than making quick changes.

## Current Status

- Phase 1: Basic chat interface implementation ✓ COMPLETE
- Phase 2: Enhanced features (formatting, animations, state persistence) ✓ COMPLETE
- Phase 3: Advanced features ⚠️ PENDING

The current issue is that user-typed messages don't appear in the chat interface. This problem requires careful analysis of how the UI components interface with the WebSocket protocol as defined in the documentation.

## Critical Guidelines 

### 1. Read and Understand Documentation First

**BEFORE MAKING ANY CHANGES:**
- Read `/Users/cskoons/projects/github/Tekton/Hephaestus/TektonUIOperation.md` thoroughly
- Understand how component chat integration works (see Section "Chat Interface Integration")
- Study the WebSocket message structure (see Section "WebSocket Communication")
- Review how component state persistence should function (see Section "Context Persistence")
- Understand the component lifecycle (initialization, operation, state persistence)

### 2. Follow a "Think, Test, Verify, Discuss" Approach

1. **Think**: Analyze potential issues based on documentation
2. **Test**: Use console logging, alerts or other non-invasive inspection methods
3. **Verify**: Confirm whether the WebSocket connection is established and messages follow protocol
4. **Discuss**: Present findings and get EXPLICIT APPROVAL before making changes

### 3. Required Testing Protocol

When testing chat functionality:
- Verify if WebSocket connection is properly established
- Check if messages follow the correct structure:
  ```javascript
  {
    "type": "COMMAND",
    "source": "UI",
    "target": componentId,
    "timestamp": isoDateString,
    "payload": {
      "command": "process_message",
      "message": messageText
    }
  }
  ```
- Verify that component state is properly stored and retrieved from localStorage
- Test event handling on chat input and send button elements

### 4. DO NOT Change Code Without Approval

- DO NOT modify any files without explicit user approval
- Present analysis and recommendations first
- Get confirmation on the specific file(s) and line(s) to modify
- Show your intended changes and get approval before implementing them

## Phase 3 Implementation Requirements

Once the chat message display issue is fixed, continue with Phase 3 implementation:

1. **Additional Components**:
   - Implement specialized terminal chat interfaces for additional components (Prometheus, Telos, etc.)
   - Ensure component-specific styling and message handling

2. **Advanced Message Handling**:
   - Implement structured message types (commands, code blocks, data visualizations)
   - Add support for file uploads and downloads within chat
   - Enable inter-component message routing

3. **Memory Integration**:
   - Implement full integration with Engram for persistent memory
   - Enable context-aware message history
   - Add commands for memory search and retrieval

4. **UI Enhancements**:
   - Add message grouping by conversation thread
   - Implement collapsible message sections
   - Add inline data visualization capabilities

## Final Notes

- The architecture is based on a clean separation between UI and AI components
- All communication should happen through the WebSocket protocol with proper message structure
- Component-specific code should be modular and follow the pattern in TektonUIOperation.md
- User experience is the priority - ensure messages are visible and the interface is responsive

Remember: No changes should be made without user approval. Think, test, verify, discuss!