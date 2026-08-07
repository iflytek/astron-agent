"""
Audit System Module

This module provides a comprehensive audit system for content processing and validation.
It includes base classes, enums, orchestrators, and utility functions for managing
audit operations across different content types and stages.

The audit system supports:
- Input and output content auditing
- Frame-based content processing
- Audit strategy management
- Content validation and filtering
- Audit result tracking and reporting

Main Components:
- BaseFrameAudit: Base class for audit operations
- InputFrameAudit: Input content audit processing
- OutputFrameAudit: Output content audit processing
- FrameAuditResult: Audit result container
- AuditContext: Session state management
- AuditOrchestrator: Unified audit operation management
- Status: Audit status enumeration
- Sentence: Text processing utilities
"""
