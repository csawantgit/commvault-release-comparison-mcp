export interface Change {
  id: string;
  title: string;
  description: string;
}

export interface ReleaseData {
  version: string;
  releaseDate: string;
  categories: {
    [category: string]: Change[];
  };
}

export const releases: Record<string, ReleaseData> = {
  "2023e": {
    version: "2023e",
    releaseDate: "2023-06-15",
    categories: {
      Virtualization: [
        {
          id: "VIRT-001",
          title: "Enhanced VMware vSphere support",
          description: "Added support for vSphere 8.0 with improved snapshot management",
        },
        {
          id: "VIRT-002",
          title: "Hyper-V incremental backup improvements",
          description: "Reduced backup time by 35% for large Hyper-V environments",
        },
      ],
      Security: [
        {
          id: "SEC-001",
          title: "FIPS 140-2 compliance",
          description: "Implemented FIPS 140-2 level 2 certification for encryption",
        },
        {
          id: "SEC-002",
          title: "Multi-factor authentication",
          description: "Added MFA support for web console access",
        },
      ],
      Database: [
        {
          id: "DB-001",
          title: "SQL Server 2022 support",
          description: "Full compatibility with SQL Server 2022 Enterprise Edition",
        },
        {
          id: "DB-002",
          title: "Oracle backup optimization",
          description: "Optimized RMAN integration for large Oracle databases",
        },
      ],
      Storage: [
        {
          id: "STG-001",
          title: "S3-compatible object storage",
          description: "Added support for MinIO and other S3-compatible storage",
        },
        {
          id: "STG-002",
          title: "Deduplication improvements",
          description: "Increased dedup ratio by 25% with new algorithms",
        },
      ],
    },
  },
  "2024e": {
    version: "2024e",
    releaseDate: "2024-06-20",
    categories: {
      Virtualization: [
        {
          id: "VIRT-003",
          title: "Kubernetes backup support",
          description: "Native backup and restore support for Kubernetes clusters",
        },
        {
          id: "VIRT-004",
          title: "vSphere 8.0 Update 2 support",
          description: "Full support for latest vSphere features and APIs",
        },
        {
          id: "VIRT-005",
          title: "Container image backup",
          description: "Backup and restore Docker and container images",
        },
      ],
      Security: [
        {
          id: "SEC-003",
          title: "Zero Trust architecture",
          description: "Implemented zero trust security model for all connections",
        },
        {
          id: "SEC-004",
          title: "Ransomware detection",
          description: "AI-powered ransomware detection and prevention",
        },
        {
          id: "SEC-005",
          title: "Secrets management integration",
          description: "Native integration with HashiCorp Vault and AWS Secrets Manager",
        },
      ],
      Database: [
        {
          id: "DB-003",
          title: "PostgreSQL backup enhancements",
          description: "Added support for PostgreSQL 16 with advanced recovery options",
        },
        {
          id: "DB-004",
          title: "MongoDB native support",
          description: "Full native MongoDB backup and restore capabilities",
        },
        {
          id: "DB-005",
          title: "Database consistency checking",
          description: "Automated DBCC and consistency checks post-restore",
        },
      ],
      Storage: [
        {
          id: "STG-003",
          title: "Azure Blob Storage integration",
          description: "Direct backup to Azure Blob Storage with tiering policies",
        },
        {
          id: "STG-004",
          title: "Intelligent tiering",
          description: "Automatic data tiering based on access patterns",
        },
        {
          id: "STG-005",
          title: "Snapshots to cloud",
          description: "Direct cloud snapshot replication and management",
        },
      ],
    },
  },
  "11.44": {
    version: "11.44",
    releaseDate: "2024-03-10",
    categories: {
      Virtualization: [
        {
          id: "VIRT-100",
          title: "VMware vCloud Director support",
          description: "Integrated backup for vCloud Director environments",
        },
        {
          id: "VIRT-101",
          title: "Instant VM recovery",
          description: "Instant VM recovery from any backup point",
        },
      ],
      Security: [
        {
          id: "SEC-100",
          title: "Encryption key rotation",
          description: "Automated encryption key rotation policies",
        },
        {
          id: "SEC-101",
          title: "HIPAA compliance mode",
          description: "Dedicated HIPAA compliance configuration and audit logging",
        },
      ],
      Database: [
        {
          id: "DB-100",
          title: "MySQL 8.0 support",
          description: "Full MySQL 8.0 backup and recovery support",
        },
        {
          id: "DB-101",
          title: "Real-time log shipping",
          description: "Continuous log shipping for minimal RPO",
        },
      ],
      Storage: [
        {
          id: "STG-100",
          title: "NAS backup optimization",
          description: "Optimized NAS backup for enterprise file shares",
        },
        {
          id: "STG-101",
          title: "Global deduplication",
          description: "Global deduplication across multiple backup locations",
        },
      ],
    },
  },
  "11.46": {
    version: "11.46",
    releaseDate: "2024-09-15",
    categories: {
      Virtualization: [
        {
          id: "VIRT-200",
          title: "vSphere storage vMotion support",
          description: "Support for backup during storage vMotion operations",
        },
        {
          id: "VIRT-201",
          title: "Hyper-V replica backup",
          description: "Backup Hyper-V replicas for geo-distributed environments",
        },
        {
          id: "VIRT-202",
          title: "Container orchestration backup",
          description: "Enhanced Docker Swarm and OpenShift backup capabilities",
        },
      ],
      Security: [
        {
          id: "SEC-200",
          title: "Immutable backup copies",
          description: "Immutable backup copies for compliance requirements",
        },
        {
          id: "SEC-201",
          title: "Threat intelligence integration",
          description: "Integration with threat intelligence feeds for proactive detection",
        },
        {
          id: "SEC-202",
          title: "Audit trail enhancement",
          description: "Enhanced audit trail with tamper detection",
        },
      ],
      Database: [
        {
          id: "DB-200",
          title: "SAP HANA 2.0 support",
          description: "Native backup support for SAP HANA 2.0",
        },
        {
          id: "DB-201",
          title: "Point-in-time recovery",
          description: "Granular point-in-time recovery for all supported databases",
        },
        {
          id: "DB-202",
          title: "Cassandra backup support",
          description: "Native Cassandra cluster backup and restore",
        },
      ],
      Storage: [
        {
          id: "STG-200",
          title: "Google Cloud Storage integration",
          description: "Direct backup to Google Cloud Storage with lifecycle policies",
        },
        {
          id: "STG-201",
          title: "Edge computing backup",
          description: "Optimized backup for distributed edge computing nodes",
        },
        {
          id: "STG-202",
          title: "Storage quality metrics",
          description: "Detailed storage quality and performance analytics",
        },
      ],
    },
  },
};

export const allVersions = Object.keys(releases);
export const allCategories = ["Virtualization", "Security", "Database", "Storage"];
