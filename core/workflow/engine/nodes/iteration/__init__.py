"""
Iteration node module for workflow engine.

This module provides iteration functionality for the workflow engine, allowing
workflows to process batch data by executing a subgraph for each item in the batch.

Classes:
    IterationNode: Main iteration node that processes batch data through workflow subgraphs
    IterationStartNode: Entry point node for each iteration within an iteration node
    IterationEndNode: Exit point node for each iteration within an iteration node

The iteration pattern enables workflows to handle collections of data efficiently
by running the same workflow logic for each item while maintaining proper state
isolation between iterations.
"""
