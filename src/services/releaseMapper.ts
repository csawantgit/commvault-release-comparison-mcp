import { Change } from "./types.js";

export interface RawReleaseItem {
  text: string;
  section: string;
}

export class ReleaseMapper {
  private categoryKeywords: Record<string, RegExp[]> = {
    Virtualization: [
      /vmware|vcenter|vsphere|hyperv|hyper-v|kubernetes|k8s|docker|container|vm|virtual machine|kvm|xen|openstack|proxmox/i,
    ],
    Security: [
      /encryption|encrypt|tls|ssl|certificate|auth|authentication|ldap|saml|mfa|multi-factor|ransomware|compliance|gdpr|hipaa|security|secure|cipher|key management/i,
    ],
    Database: [
      /oracle|sql server|sqlserver|postgres|postgresql|mysql|mariadb|mongodb|nosql|cassandra|hana|db2|sybase|database|db|bigquery|dynamodb/i,
    ],
    Storage: [
      /s3|aws|azure|gcs|google cloud|object storage|blob|dedup|deduplica|tape|backup destination|storage pool|storage|backup store|s3-compatible|object|archive/i,
    ],
    Platform: [
      /api|rest|graphql|webhook|sdk|integration|command center|cli|ui|interface|dashboard|portal|console|platform|web|application|agent|client/i,
    ],
    Performance: [
      /improve|optimize|optimized|faster|performance|efficiency|throughput|latency|scalability|reduce|reduc|speed|accelerat|enhancement|enhanc/i,
    ],
  };

  categorizeItem(item: RawReleaseItem): string {
    const text = `${item.text} ${item.section}`.toLowerCase();
    let bestCategory = "Platform";
    let bestScore = 0;

    for (const [category, patterns] of Object.entries(this.categoryKeywords)) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  categorizeBatch(
    items: RawReleaseItem[],
    version: string
  ): Record<string, Change[]> {
    const categorized: Record<string, Change[]> = {
      Virtualization: [],
      Security: [],
      Database: [],
      Storage: [],
      Platform: [],
      Performance: [],
    };

    for (const item of items) {
      const category = this.categorizeItem(item);
      const index = categorized[category].length + 1;

      categorized[category].push({
        id: `${version}-${category.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        title: this.extractTitle(item.text),
        description: this.extractDescription(item.text),
      });
    }

    return categorized;
  }

  private extractTitle(text: string): string {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return text;

    const firstLine = lines[0];
    const colonIndex = firstLine.indexOf(":");
    if (colonIndex > 0 && colonIndex < 100) {
      return firstLine.substring(0, colonIndex).trim();
    }

    return firstLine.substring(0, Math.min(80, firstLine.length)).trim();
  }

  private extractDescription(text: string): string {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return "Feature enhancement";

    const firstLine = lines[0];
    const colonIndex = firstLine.indexOf(":");
    if (colonIndex > 0 && colonIndex < 100) {
      const afterColon = firstLine.substring(colonIndex + 1).trim();
      if (afterColon) {
        return afterColon;
      }
    }

    if (lines.length > 1) {
      return lines.slice(1).join(" ").substring(0, 200);
    }

    return "Feature enhancement";
  }
}
