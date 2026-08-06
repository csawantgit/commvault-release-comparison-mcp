# Commvault Release Comparison MCP

## Problem Statement

Commvault customers and administrators often need to understand differences between product releases before planning upgrades.

Release information is distributed across multiple documentation pages and release versions, making it difficult to identify changes relevant to specific product areas such as Virtualization, Security, Storage, Databases, APIs, and User Experience.

## Proposed Solution

Build an MCP server that allows users to:

* Compare two Commvault releases
* View categorized changes
* Generate user-friendly summaries
* Query changes by functional area

## Initial MCP Tools

1. compare_releases
2. get_release_changes
3. get_category_changes
4. generate_summary