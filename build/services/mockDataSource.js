/**
 * Mock Data Source - Provides realistic test data for development
 * Based on actual Commvault release information
 */
export class MockDataSource {
    constructor() {
        this.name = "Mock Data";
        this.description = "Mock release data for testing and development";
        this.mockData = {
            "11.44": {
                version: "11.44",
                releaseDate: "2023-04-15",
                categories: {
                    Virtualization: [
                        {
                            id: "virt-001",
                            title: "Enhanced Kubernetes Support",
                            description: "Improved backup and recovery for Kubernetes environments with better cluster discovery and namespace management",
                        },
                        {
                            id: "virt-002",
                            title: "VMware Live Migration Enhancements",
                            description: "Optimized live migration handling with reduced RTO and support for vSphere 8.0",
                        },
                        {
                            id: "virt-003",
                            title: "Hyper-V 2022 Support",
                            description: "Full compatibility with Windows Server 2022 Hyper-V environments",
                        },
                    ],
                    Security: [
                        {
                            id: "sec-001",
                            title: "Enhanced Encryption",
                            description: "Support for AES-256-GCM encryption across all data channels",
                        },
                        {
                            id: "sec-002",
                            title: "LDAP Enhancements",
                            description: "Improved LDAP synchronization and multi-domain support",
                        },
                        {
                            id: "sec-003",
                            title: "API Rate Limiting",
                            description: "New API rate limiting policies to prevent abuse and ensure stability",
                        },
                    ],
                    Database: [
                        {
                            id: "db-001",
                            title: "Oracle 21c Support",
                            description: "Full compatibility with Oracle Database 21c latest releases",
                        },
                        {
                            id: "db-002",
                            title: "SQL Server 2022 Support",
                            description: "Support for SQL Server 2022 backup and recovery operations",
                        },
                        {
                            id: "db-003",
                            title: "PostgreSQL Backup Enhancements",
                            description: "Improved incremental backup support for PostgreSQL with block-level tracking",
                        },
                        {
                            id: "db-004",
                            title: "MySQL Point-in-Time Recovery",
                            description: "Granular point-in-time recovery for MySQL with binary log management",
                        },
                    ],
                    Storage: [
                        {
                            id: "stor-001",
                            title: "S3-Compatible Object Storage",
                            description: "Support for S3-compatible storage including MinIO and Dell ECS",
                        },
                        {
                            id: "stor-002",
                            title: "Deduplication Improvements",
                            description: "30% improvement in deduplication efficiency with fingerprint optimizations",
                        },
                        {
                            id: "stor-003",
                            title: "Tape Library Enhancements",
                            description: "Better tape library management with automatic media rotation",
                        },
                    ],
                    APIs: [
                        {
                            id: "api-001",
                            title: "REST API v2 General Availability",
                            description: "Production-ready REST API v2 with improved performance and stability",
                        },
                        {
                            id: "api-002",
                            title: "Webhook Support",
                            description: "Event-driven webhooks for automated workflow integration",
                        },
                    ],
                    "User Experience": [
                        {
                            id: "ux-001",
                            title: "Command Center UI Redesign",
                            description: "Modernized Command Center interface with improved dashboard and navigation",
                        },
                        {
                            id: "ux-002",
                            title: "Dark Mode Support",
                            description: "Optional dark mode theme for reduced eye strain in low-light environments",
                        },
                        {
                            id: "ux-003",
                            title: "Improved Job Monitoring",
                            description: "Enhanced job monitoring dashboard with real-time progress tracking",
                        },
                    ],
                },
            },
            "11.46": {
                version: "11.46",
                releaseDate: "2023-08-20",
                categories: {
                    Virtualization: [
                        {
                            id: "virt-001",
                            title: "Enhanced Kubernetes Support",
                            description: "Improved backup and recovery for Kubernetes environments with better cluster discovery and namespace management",
                        },
                        {
                            id: "virt-002",
                            title: "VMware Live Migration Enhancements",
                            description: "Optimized live migration handling with reduced RTO and support for vSphere 8.0",
                        },
                        {
                            id: "virt-003",
                            title: "Hyper-V 2022 Support",
                            description: "Full compatibility with Windows Server 2022 Hyper-V environments",
                        },
                        {
                            id: "virt-004",
                            title: "OpenStack Cloud Platform Support",
                            description: "Native backup and recovery support for OpenStack-based cloud environments",
                        },
                        {
                            id: "virt-005",
                            title: "Proxmox VE Integration",
                            description: "New support for Proxmox Virtual Environment with VM backup and recovery",
                        },
                    ],
                    Security: [
                        {
                            id: "sec-001",
                            title: "Enhanced Encryption",
                            description: "Support for AES-256-GCM encryption across all data channels",
                        },
                        {
                            id: "sec-002",
                            title: "LDAP Enhancements",
                            description: "Improved LDAP synchronization and multi-domain support",
                        },
                        {
                            id: "sec-003",
                            title: "API Rate Limiting",
                            description: "New API rate limiting policies to prevent abuse and ensure stability",
                        },
                        {
                            id: "sec-004",
                            title: "Multi-Factor Authentication (MFA)",
                            description: "Support for FIDO2, TOTP, and SMS-based MFA for console access",
                        },
                        {
                            id: "sec-005",
                            title: "Zero Trust Security Architecture",
                            description: "Implementation of zero-trust principles with continuous authentication and authorization",
                        },
                        {
                            id: "sec-006",
                            title: "Ransomware Detection Enhancements",
                            description: "Improved ransomware detection with ML-based anomaly detection",
                        },
                    ],
                    Database: [
                        {
                            id: "db-001",
                            title: "Oracle 21c Support",
                            description: "Full compatibility with Oracle Database 21c latest releases",
                        },
                        {
                            id: "db-002",
                            title: "SQL Server 2022 Support",
                            description: "Support for SQL Server 2022 backup and recovery operations",
                        },
                        {
                            id: "db-003",
                            title: "PostgreSQL Backup Enhancements",
                            description: "Improved incremental backup support for PostgreSQL with block-level tracking",
                        },
                        {
                            id: "db-004",
                            title: "MySQL Point-in-Time Recovery",
                            description: "Granular point-in-time recovery for MySQL with binary log management",
                        },
                        {
                            id: "db-005",
                            title: "MongoDB Sharded Cluster Support",
                            description: "Support for backing up and recovering MongoDB sharded clusters",
                        },
                        {
                            id: "db-006",
                            title: "SAP HANA Support Expansion",
                            description: "Extended SAP HANA support with improved snapshot management",
                        },
                    ],
                    Storage: [
                        {
                            id: "stor-001",
                            title: "S3-Compatible Object Storage",
                            description: "Support for S3-compatible storage including MinIO and Dell ECS",
                        },
                        {
                            id: "stor-002",
                            title: "Deduplication Improvements",
                            description: "30% improvement in deduplication efficiency with fingerprint optimizations",
                        },
                        {
                            id: "stor-003",
                            title: "Tape Library Enhancements",
                            description: "Better tape library management with automatic media rotation",
                        },
                        {
                            id: "stor-004",
                            title: "Google Cloud Storage Integration",
                            description: "Native support for Google Cloud Storage as a backup destination",
                        },
                        {
                            id: "stor-005",
                            title: "Azure Blob Storage Tiering",
                            description: "Automatic tiering between hot and cold Azure Blob Storage tiers",
                        },
                    ],
                    APIs: [
                        {
                            id: "api-001",
                            title: "REST API v2 General Availability",
                            description: "Production-ready REST API v2 with improved performance and stability",
                        },
                        {
                            id: "api-002",
                            title: "Webhook Support",
                            description: "Event-driven webhooks for automated workflow integration",
                        },
                        {
                            id: "api-003",
                            title: "GraphQL API (Beta)",
                            description: "New GraphQL API for more flexible data querying",
                        },
                        {
                            id: "api-004",
                            title: "Terraform Provider",
                            description: "Official Terraform provider for Infrastructure as Code management",
                        },
                    ],
                    "User Experience": [
                        {
                            id: "ux-001",
                            title: "Command Center UI Redesign",
                            description: "Modernized Command Center interface with improved dashboard and navigation",
                        },
                        {
                            id: "ux-002",
                            title: "Dark Mode Support",
                            description: "Optional dark mode theme for reduced eye strain in low-light environments",
                        },
                        {
                            id: "ux-003",
                            title: "Improved Job Monitoring",
                            description: "Enhanced job monitoring dashboard with real-time progress tracking",
                        },
                        {
                            id: "ux-004",
                            title: "Mobile App Enhancements",
                            description: "New mobile app features for on-the-go backup and restore management",
                        },
                        {
                            id: "ux-005",
                            title: "Intelligent Search",
                            description: "AI-powered search across all UI elements and documentation",
                        },
                    ],
                },
            },
        };
    }
    async fetch(version) {
        const data = this.mockData[version];
        if (!data) {
            throw new Error(`Mock data not available for version ${version}. Available: ${Object.keys(this.mockData).join(", ")}`);
        }
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return data;
    }
    /**
     * Get all available versions in mock data
     */
    getAvailableVersions() {
        return Object.keys(this.mockData);
    }
}
