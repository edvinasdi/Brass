import { networkInterfaces } from "os";

export interface ConnectionInfo {
  preferredJoinUrl: string;
}

interface HostCandidate {
  address: string;
  score: number;
}

function scoreHostCandidate(interfaceName: string, address: string): number {
  const normalizedName = interfaceName.toLowerCase();
  let score = 0;

  if (
    normalizedName.includes("wi-fi") ||
    normalizedName.includes("wifi") ||
    normalizedName.includes("wireless") ||
    normalizedName.includes("wlan")
  ) {
    score += 40;
  }

  if (normalizedName.includes("ethernet")) {
    score += 30;
  }

  if (address.startsWith("192.168.")) {
    score += 15;
  } else if (address.startsWith("172.")) {
    score += 10;
  } else if (address.startsWith("10.")) {
    score += 5;
  }

  if (
    normalizedName.includes("nord") ||
    normalizedName.includes("vpn") ||
    normalizedName.includes("tun") ||
    normalizedName.includes("tap") ||
    normalizedName.includes("virtual") ||
    normalizedName.includes("loopback")
  ) {
    score -= 100;
  }

  return score;
}

function getAccessibleHostCandidates(): HostCandidate[] {
  const interfaces = networkInterfaces();
  const hostCandidates = new Map<string, HostCandidate>();

  for (const [interfaceName, networkInterface] of Object.entries(interfaces)) {
    if (!networkInterface) {
      continue;
    }

    for (const address of networkInterface) {
      if (address.family === "IPv4" && !address.internal) {
        hostCandidates.set(address.address, {
          address: address.address,
          score: scoreHostCandidate(interfaceName, address.address),
        });
      }
    }
  }

  return Array.from(hostCandidates.values()).sort((left, right) => {
    return right.score - left.score || left.address.localeCompare(right.address);
  });
}

export function getConnectionInfo(port: number): ConnectionInfo {
  const hostCandidates = getAccessibleHostCandidates();
  const preferredHost = hostCandidates[0]?.address ?? "localhost";

  return {
    preferredJoinUrl: `http://${preferredHost}:${port}`,
  };
}

