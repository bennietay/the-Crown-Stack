export type HostingProvider = {
  createWebsite(input: { customerName: string; domain?: string; orderId?: number; datacenterCode?: string }): Promise<{ installationId: string; temporaryUrl: string }>;
  getWebsiteStatus(installationId: string): Promise<{ status: string; sslStatus: string }>;
};

export class MockHostingerProvider implements HostingProvider {
  async createWebsite(input: { customerName: string; domain?: string }) {
    const slug = input.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "waas-site";
    return { installationId: `mock-${crypto.randomUUID()}`, temporaryUrl: `https://${slug}.preview.bennietay.com` };
  }
  async getWebsiteStatus() { return { status: "ready", sslStatus: "pending" }; }
}

class HostingerApiProvider implements HostingProvider {
  private readonly baseUrl = (process.env.HOSTINGER_API_BASE_URL || "https://developers.hostinger.com/api").replace(/\/$/, "");
  private readonly token = process.env.HOSTINGER_API_TOKEN || "";

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
    const body = await response.text();
    if (!response.ok) throw new Error(`Hostinger API ${response.status}: ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) as T : {} as T;
  }

  async createWebsite(input: { customerName: string; domain?: string; orderId?: number; datacenterCode?: string }) {
    const domain = input.domain?.trim();
    const orderId = input.orderId ?? Number(process.env.HOSTINGER_ORDER_ID || 0);
    if (!domain || !orderId) throw new Error("Hostinger provisioning requires a domain and HOSTINGER_ORDER_ID (or an orderId)");
    await this.request("/hosting/v1/websites", { method: "POST", body: JSON.stringify({ domain, order_id: orderId, datacenter_code: input.datacenterCode || process.env.HOSTINGER_DATACENTER_CODE || null }) });
    const slug = domain.replace(/^www\./, "");
    return { installationId: slug, temporaryUrl: `https://${slug}` };
  }

  async getWebsiteStatus(installationId: string) {
    const result = await this.request<{ data?: Array<{ domain: string; is_enabled?: boolean; website_type?: string }> }>("/hosting/v1/websites");
    const website = result.data?.find(item => item.domain === installationId);
    if (!website) return { status: "pending", sslStatus: "unknown" };
    return { status: website.is_enabled === false ? "disabled" : "ready", sslStatus: website.is_enabled === false ? "unknown" : "pending" };
  }
}

export function getHostingProvider(): HostingProvider {
  return process.env.HOSTINGER_API_TOKEN ? new HostingerApiProvider() : new MockHostingerProvider();
}
