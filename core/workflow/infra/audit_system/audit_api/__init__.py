"""
Audit API module for content security validation.

This module provides abstract interfaces and concrete implementations for
content security audit systems used in LLM applications. It includes:

- Base abstract classes defining the audit API interface
- IFlyTek audit API implementation for production use
- Mock audit API implementation for testing and development

The audit system supports various content types including text, images,
videos, and audio, with comprehensive security assessment capabilities.
"""
