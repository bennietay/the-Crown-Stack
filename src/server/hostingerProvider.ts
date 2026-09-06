export type HostingProvider = {
  createWebsite(input: { customerName: string; domain?: string; orderId?: number; datacenterCode?: string }): Promise<{ installationId: string; temporaryUrl: string }>;
  installWordPress(installationId: string, credentials: { email: string; login: string; password: string; siteTitle?: string }): Promise<{ wordpressVersion: string; installationId?: string }>;
  installTheme(installationId: string, themePackageId: string): Promise<void>;
  installPlugin(installationId: string, pluginPackageId: string): Promise<void>;
  configureManagedSite(installationId: string, input: { websiteId: string; adminApiUrl: string; connectorSecret: string; configuration: Record<string, unknown> }): Promise<void>;
  configureDomain(installationId: string, domain: string): Promise<void>;
  getWebsiteStatus(installationId: string): Promise<{ status: string; sslStatus: string }>;
};

export class MockHostingerProvider implements HostingProvider {
  async createWebsite(input: { customerName: string; domain?: string }) {
    const slug = input.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "waas-site";
    return { installationId: `mock-${crypto.randomUUID()}`, temporaryUrl: `https://${slug}.preview.bennietay.com` };
  }
  async installWordPress(installationId: string, _credentials: { email: string; login: string; password: string; siteTitle?: string }) { return { wordpressVersion: "6.8-mock", installationId }; }
  async installTheme(_installationId: string, _themePackageId: string) { return undefined; }
  async installPlugin(_installationId: string, _pluginPackageId: string) { return undefined; }
  async configureManagedSite(_installationId: string, _input: { websiteId: string; adminApiUrl: string; connectorSecret: string; configuration: Record<string, unknown> }) { return undefined; }
  async configureDomain(_installationId: string, _domain: string) { return undefined; }
  async getWebsiteStatus() { return { status: "ready", sslStatus: "active" }; }
}

class HostingerApiProvider implements HostingProvider {
  private readonly baseUrl = (process.env.HOSTINGER_API_BASE_URL || "https://developers.hostinger.com/api").replace(/\/$/, "");
  private readonly token = process.env.HOSTINGER_API_TOKEN || "";
  private readonly username = process.env.HOSTINGER_USERNAME || "";
  private readonly timeoutMs = Number(process.env.HOSTINGER_TIMEOUT_MS || 10000);
  private readonly pollAttempts = Math.max(1, Number(process.env.HOSTINGER_POLL_ATTEMPTS || 12));
  private readonly pollIntervalMs = Math.max(250, Number(process.env.HOSTINGER_POLL_INTERVAL_MS || 5000));

  private async request<T>(path: string, init: RequestInit = {}, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, { ...init, signal: controller.signal, headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
        const body = await response.text();
        if (!response.ok) {
          const error = new Error(`Hostinger API ${response.status}: ${body.slice(0, 300)}`);
          if (response.status < 500 && response.status !== 429) throw error;
          lastError = error;
        } else return body ? JSON.parse(body) as T : {} as T;
      } catch (error) { lastError = error; if (attempt === attempts - 1) break; }
      finally { clearTimeout(timeout); }
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
    throw lastError instanceof Error ? lastError : new Error("Hostinger request failed");
  }

  private async uploadDirectory(username: string, domain: string, localDirectory: string, remoteDirectory: string) {
    const credentials = await this.request<{ url: string; auth_key: string; rest_auth_key: string }>("/hosting/v1/files/upload-urls", { method: "POST", body: JSON.stringify({ username, domain }) });
    const walk = async (directory: string): Promise<string[]> => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : Promise.resolve([path.join(directory, entry.name)])));
      return nested.flat();
    };
    const files = await walk(localDirectory);
    if (!files.length) throw new Error(`Managed package ${path.basename(localDirectory)} contains no files`);
    for (const filename of files) {
      const bytes = await fs.readFile(filename);
      const relative = path.relative(localDirectory, filename).split(path.sep).map(encodeURIComponent).join("/");
      const destination = `${credentials.url.replace(/\/$/, "")}/${remoteDirectory}/${relative}?override=true`;
      const uploadHeaders = { "X-Auth": credentials.auth_key, "X-Auth-Rest": credentials.rest_auth_key, "Tus-Resumable": "1.0.0" };
      const created = await fetch(destination, { method: "POST", headers: { ...uploadHeaders, "Upload-Length": String(bytes.byteLength), "Upload-Offset": "0" } });
      if (!created.ok && created.status !== 409) throw new Error(`Hostinger upload initialization failed (${created.status}) for ${relative}`);
      const uploaded = await fetch(destination, { method: "PATCH", headers: { ...uploadHeaders, "Content-Type": "application/offset+octet-stream", "Upload-Offset": "0" }, body: bytes });
      if (!uploaded.ok) throw new Error(`Hostinger upload failed (${uploaded.status}) for ${relative}`);
      const offset = Number(uploaded.headers.get("upload-offset") || bytes.byteLength);
      if (offset !== bytes.byteLength) throw new Error(`Hostinger upload was incomplete for ${relative}`);
    }
  }

  async createWebsite(input: { customerName: string; domain?: string; orderId?: number; datacenterCode?: string }) {
    const domain = input.domain?.trim();
    const orderId = input.orderId ?? Number(process.env.HOSTINGER_ORDER_ID || 0);
    if (!domain || !orderId || !this.username) throw new Error("Hostinger provisioning requires a domain, HOSTINGER_ORDER_ID and HOSTINGER_USERNAME");
    const normalizedDomain = domain.replace(/^www\./, "").toLowerCase();
    const existing = await this.request<{ data?: Array<{ domain: string; username?: string }> }>(`/hosting/v1/websites?domain=${encodeURIComponent(domain)}`);
    if (!existing.data?.some(item => item.domain.replace(/^www\./, "").toLowerCase() === normalizedDomain)) {
      await this.request("/hosting/v1/websites", { method: "POST", body: JSON.stringify({ domain, order_id: orderId, datacenter_code: input.datacenterCode || process.env.HOSTINGER_DATACENTER_CODE || null }) });
    }
    for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
      const websites = await this.request<{ data?: Array<{ domain: string; username?: string }> }>(`/hosting/v1/websites?domain=${encodeURIComponent(domain)}`);
      const website = websites.data?.find(item => item.domain.replace(/^www\./, "").toLowerCase() === normalizedDomain);
      if (website) return { installationId: `${website.username || this.username}|${normalizedDomain}`, temporaryUrl: `https://${normalizedDomain}` };
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
    throw new Error("Hostinger website did not become available before the polling deadline");
  }
  private installationParts(installationId: string) {
    const parts = installationId.split("|");
    const username = parts.length > 1 ? parts[0] : this.username;
    const domain = parts.length > 1 ? parts[1] : installationId;
    const software = parts.length > 2 ? parts[2] : undefined;
    if (!username || !domain) throw new Error("Hostinger installation identity is incomplete");
    return { username, domain, software };
  }
  private async findWordPressInstallation(username: string, domain: string) {
    const result = await this.request<Array<{ id: string | number; domain: string; version?: string; is_valid?: boolean }>>(`/hosting/v1/wordpress/installations?username=${encodeURIComponent(username)}&domain=${encodeURIComponent(domain)}`);
    return result.find(item => item.domain === domain);
  }
  async installWordPress(installationId: string, credentials: { email: string; login: string; password: string; siteTitle?: string }) {
    const { username, domain } = this.installationParts(installationId);
    const { email, login, password } = credentials;
    if (!email || !login || !password) throw new Error("Unique WordPress installation credentials are required");
    const existing = await this.findWordPressInstallation(username, domain);
    if (!existing) {
      await this.request(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/installations`, { method: "POST", body: JSON.stringify({ domain, site_title: credentials.siteTitle || domain, language: "en_US", directory: "public_html", overwrite: false, auto_updates: "minor", credentials: { email, login, password } }) });
    }
    for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
      const installation = await this.findWordPressInstallation(username, domain);
      if (installation?.id && installation.is_valid !== false) return { wordpressVersion: installation.version || "managed", installationId: `${username}|${domain}|${String(installation.id)}` };
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
    throw new Error("Hostinger WordPress installation did not become ready before the polling deadline");
  }
  async installTheme(installationId: string, themePackageId: string) {
    const { username, domain, software } = this.installationParts(installationId);
    if (!software) throw new Error("Hostinger theme installation requires the WordPress software id");
    const customPath = process.env.HOSTINGER_THEME_PATH;
    const managedSlug = themePackageId.startsWith("bennietay-launch") ? "bennietay-launch" : themePackageId.startsWith("bennietay-business") ? "bennietay-business" : "";
    if (!customPath && !managedSlug) { await this.request(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/${encodeURIComponent(software)}/themes/install`, { method: "POST", body: JSON.stringify({ theme: themePackageId }) }); return; }
    const themePath = customPath || managedSlug;
    if (!customPath) await this.uploadDirectory(username, domain, path.resolve(process.cwd(), "wordpress-themes", managedSlug), `wp-content/themes/${managedSlug}`);
    await this.request(`/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/wordpress/themes/deploy`, { method: "POST", body: JSON.stringify({ slug: managedSlug || themePackageId, theme_path: themePath, is_activated: true }) });
    const expectedSlug = managedSlug || themePackageId;
    for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
      const themes = await this.request<Array<{ slug?: string; name?: string; status?: string; is_active?: boolean }>>(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/${encodeURIComponent(software)}/themes`);
      const installed = themes.find(item => (item.slug || item.name) === expectedSlug);
      if (installed && (installed.is_active === true || installed.status === "active")) return;
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
    throw new Error(`Hostinger theme ${expectedSlug} was not confirmed active before the polling deadline`);
  }
  async installPlugin(installationId: string, pluginPackageId: string) {
    const { username, domain, software } = this.installationParts(installationId);
    if (!software) throw new Error("Hostinger plugin installation requires the WordPress software id");
    const customPath = process.env.HOSTINGER_PLUGIN_PATH;
    if (customPath || pluginPackageId === "bennietay-managed-connector") {
      const pluginPath = customPath || pluginPackageId;
      if (!customPath) await this.uploadDirectory(username, domain, path.resolve(process.cwd(), "wordpress-plugin", pluginPackageId), `wp-content/plugins/${pluginPackageId}`);
      await this.request(`/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/wordpress/plugins/deploy`, { method: "POST", body: JSON.stringify({ slug: pluginPackageId, plugin_path: pluginPath }) });
      for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
        const plugins = await this.request<Array<{ slug?: string; name?: string; status?: string; is_active?: boolean }>>(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/${encodeURIComponent(software)}/plugins`);
        const installed = plugins.find(item => (item.slug || item.name) === pluginPackageId);
        if (installed && (installed.is_active === true || installed.status === "active")) return;
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      }
      throw new Error(`Hostinger plugin ${pluginPackageId} was not confirmed active before the polling deadline`);
    }
    await this.request(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/${encodeURIComponent(software)}/plugins/install`, { method: "POST", body: JSON.stringify({ plugins: [pluginPackageId] }) });
  }
  async configureManagedSite(installationId: string, input: { websiteId: string; adminApiUrl: string; connectorSecret: string; configuration: Record<string, unknown> }) {
    const { username, domain } = this.installationParts(installationId);
    const credentials = await this.request<{ url: string; auth_key: string; rest_auth_key: string }>("/hosting/v1/files/upload-urls", { method: "POST", body: JSON.stringify({ username, domain }) });
    const encodedConfiguration = Buffer.from(JSON.stringify(input.configuration), "utf8").toString("base64");
    const php = Buffer.from(`<?php\n/** Generated site-scoped WAAS configuration. */\ndefined('ABSPATH') || exit;\ndefine('BENNIETAY_WEBSITE_ID', ${JSON.stringify(input.websiteId)});\ndefine('BENNIETAY_ADMIN_API_URL', ${JSON.stringify(input.adminApiUrl.replace(/\/$/, ""))});\ndefine('BENNIETAY_CONNECTOR_SECRET', ${JSON.stringify(input.connectorSecret)});\nadd_action('init', static function () {\n  $value = json_decode(base64_decode(${JSON.stringify(encodedConfiguration)}), true);\n  if (is_array($value) && get_option('bennietay_managed_config_hash') !== ${JSON.stringify(crypto.createHash("sha256").update(encodedConfiguration).digest("hex"))}) {\n    update_option('bennietay_managed_config', $value, false);\n    update_option('bennietay_managed_config_hash', ${JSON.stringify(crypto.createHash("sha256").update(encodedConfiguration).digest("hex"))}, false);\n  }\n});\n`, "utf8");
    const destination = `${credentials.url.replace(/\/$/, "")}/wp-content/plugins/bennietay-managed-connector/site-config.php?override=true`;
    const headers = { "X-Auth": credentials.auth_key, "X-Auth-Rest": credentials.rest_auth_key, "Tus-Resumable": "1.0.0" };
    const created = await fetch(destination, { method: "POST", headers: { ...headers, "Upload-Length": String(php.byteLength), "Upload-Offset": "0" } });
    if (!created.ok && created.status !== 409) throw new Error(`Hostinger managed configuration initialization failed (${created.status})`);
    const uploaded = await fetch(destination, { method: "PATCH", headers: { ...headers, "Content-Type": "application/offset+octet-stream", "Upload-Offset": "0" }, body: php });
    if (!uploaded.ok || Number(uploaded.headers.get("upload-offset") || php.byteLength) !== php.byteLength) throw new Error(`Hostinger managed configuration upload failed (${uploaded.status})`);
  }
  async configureDomain(installationId: string, domain: string) { const { username } = this.installationParts(installationId); const websites = await this.request<{ data?: Array<{ domain: string }> }>("/hosting/v1/websites"); if (!websites.data?.some(item => item.domain === domain)) throw new Error(`Hostinger website ${domain} was not found after provisioning for ${username}`); }
  async getWebsiteStatus(installationId: string) {
    const { username, domain } = this.installationParts(installationId);
    const websiteResult = await this.request<{ data?: Array<{ domain: string; is_enabled?: boolean }> }>("/hosting/v1/websites");
    const website = websiteResult.data?.find(item => item.domain === domain);
    if (!website) return { status: "pending", sslStatus: "unknown" };
    const installation = await this.findWordPressInstallation(username, domain);
    if (!installation) return { status: website.is_enabled === false ? "disabled" : "pending", sslStatus: "unknown" };
    if (website.is_enabled === false || installation.is_valid === false) return { status: "disabled", sslStatus: "unknown" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 10000));
    try {
      // A successful HTTPS handshake proves DNS resolves and the certificate is
      // currently valid. Any HTTP status is acceptable for this transport check.
      await fetch(`https://${domain}`, { method: "HEAD", redirect: "manual", signal: controller.signal });
      return { status: "ready", sslStatus: "active" };
    } catch {
      return { status: "ready", sslStatus: "pending" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getHostingProvider(): HostingProvider {
  if (process.env.HOSTINGER_API_TOKEN) return new HostingerApiProvider();
  if (process.env.NODE_ENV === "production") throw new Error("Hostinger is not configured; mock deployment is disabled in production");
  return new MockHostingerProvider();
}
export function getHostingProviderKind(): "hostinger" | "mock" { return process.env.HOSTINGER_API_TOKEN ? "hostinger" : "mock"; }
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
