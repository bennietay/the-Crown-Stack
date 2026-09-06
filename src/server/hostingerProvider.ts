export type HostingProvider = {
  createWebsite(input: { customerName: string; domain?: string }): Promise<{ installationId: string; temporaryUrl: string }>;
  getWebsiteStatus(installationId: string): Promise<{ status: string; sslStatus: string }>;
};

export class MockHostingerProvider implements HostingProvider {
  async createWebsite(input: { customerName: string; domain?: string }) {
    const slug = input.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "waas-site";
    return { installationId: `mock-${crypto.randomUUID()}`, temporaryUrl: `https://${slug}.preview.bennietay.com` };
  }
  async getWebsiteStatus() { return { status: "ready", sslStatus: "pending" }; }
}

export function getHostingProvider(): HostingProvider { return new MockHostingerProvider(); }
