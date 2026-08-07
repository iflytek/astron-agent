"""
If-Else Node Module

This module provides the implementation of conditional branching nodes for the workflow engine.
It includes support for multiple comparison operators, logical operations, and branch-based
execution flow.

Components:
- IFElseNode: Main node class for conditional execution
- IfElseNodeData: Data structures for branch configuration
- if_else_schema: JSON schema for node configuration validation

The if-else node evaluates multiple branches in priority order and executes the first
branch that meets its conditions, following short-circuit evaluation principles.
"""
