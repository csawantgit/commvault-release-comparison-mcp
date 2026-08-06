# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-06

### Added

#### Core MCP Server Infrastructure
- Initial Model Context Protocol (MCP) server implementation
- StdIO transport for integration with Claude and other AI assistants
- Dynamic tool registration with runtime schema generation
- Tool definitions for four primary comparison and analysis operations

#### Release Comparison Tools
- **compare_releases**: Side-by-side comparison of two Commvault release versions with category-wise change analysis
- **get_release_changes**: Retrieve all changes for a specific release, optionally filtered by functional category
- **get_category_changes**: Track feature evolution across multiple releases within a functional area
- **generate_summary**: Generate human-readable release summaries in multiple formats (markdown, HTML, plaintext)

#### Data Loading Architecture
- Multi-source data loading system with automatic fallback
- Pluggable data source interface for extensibility
- TTL-based caching with automatic expiration for performance
- Dynamic version loading on first access

#### Data Sources
- **Live Commvault Documentation Source**: Fetches real release data from official Commvault documentation
  - Support for Innovation Release 11.44 and 11.46
  - Automatic HTML parsing and extraction
- **Mock Data Source**: Fallback test data for versions 11.44 and 11.46
- Automatic fallback when web sources are unavailable

#### Documentation Parsing & Processing
- Commvault HTML documentation parser using Cheerio
- Table-based change extraction for version 11.44
- Heading-based change extraction for structured content
- HTML structure analysis and adaptation to documentation variations

#### Category Mapping & Organization
- Automatic categorization of changes into functional areas:
  - Virtualization
  - Security
  - Database
  - Storage
  - Platform
  - Performance
  - APIs
  - User Experience
- Category-based filtering and querying
- Support for multi-category changes

#### Release Management
- ReleaseManager singleton for coordinated data operations
- Release data coordination and state management
- Version availability tracking
- Metadata preservation from documentation sources

#### Build & Development
- TypeScript 5.0+ compilation with strict type checking
- Node.js 18+ runtime support
- CLI binary entry point (`commvault-release-comparison`)
- Development watch mode for active development
- Comprehensive TypeScript configuration

#### Documentation & Examples
- Comprehensive README with architecture diagrams
- Data loading architecture documentation
- Data sources configuration guide
- Implementation examples and use cases
- Project planning and design documentation
- Quick-start guide for local setup
- Example data files for testing and reference

#### Project Configuration
- MIT License
- .gitignore with comprehensive exclusions
- package.json with proper dependencies and metadata
- TypeScript configuration optimized for ES2020 output
- Node.js shebang support for CLI execution

### Notes

- This release focuses on core comparison functionality and data loading infrastructure
- Live data fetching is enabled with fallback to mock data
- Support for Commvault Innovation Releases 11.44 and 11.46
- Extensible architecture supports future data sources and comparison features
- Full type safety through TypeScript strict mode

[Unreleased]: https://github.com/csawantgit/commvault-release-comparison-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/csawantgit/commvault-release-comparison-mcp/releases/tag/v1.0.0
