<?php
/**
 * Plugin Name: BennieTay Managed Website Connector
 * Description: Durable lead delivery and managed configuration for BennieTay WAAS websites.
 * Version: 0.2.0
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) { exit; }
$site_config = __DIR__ . '/site-config.php';
if (is_readable($site_config)) { require_once $site_config; }

final class BennieTay_Managed_Connector {
    const VERSION = '0.2.0';
    const OUTBOX_OPTION = 'bennietay_connector_outbox';
    const CONFIG_OPTION = 'bennietay_managed_config';

    public static function boot() {
        add_action('rest_api_init', [__CLASS__, 'routes']);
        add_filter('cron_schedules', [__CLASS__, 'cron_schedule']);
        add_action('bennietay_connector_flush_outbox', [__CLASS__, 'flush_outbox']);
        add_shortcode('bennietay_lead_form', [__CLASS__, 'lead_form']);
        register_activation_hook(__FILE__, [__CLASS__, 'activate']);
        register_deactivation_hook(__FILE__, [__CLASS__, 'deactivate']);
    }

    public static function activate() {
        if (!wp_next_scheduled('bennietay_connector_flush_outbox')) {
            wp_schedule_event(time() + 60, 'bennietay_five_minutes', 'bennietay_connector_flush_outbox');
        }
    }

    public static function deactivate() { wp_clear_scheduled_hook('bennietay_connector_flush_outbox'); }

    public static function cron_schedule($schedules) {
        $schedules['bennietay_five_minutes'] = ['interval' => 300, 'display' => 'Every five minutes'];
        return $schedules;
    }

    public static function routes() {
        register_rest_route('bennietay/v1', '/health', [
            'methods' => 'GET', 'permission_callback' => '__return_true',
            'callback' => function () { return rest_ensure_response(['ok' => true, 'pluginVersion' => self::VERSION, 'wordpressVersion' => get_bloginfo('version'), 'siteUrl' => home_url('/'), 'queuedLeads' => count(self::outbox())]); },
        ]);
        register_rest_route('bennietay/v1', '/lead', ['methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => [__CLASS__, 'lead']]);
        register_rest_route('bennietay/v1', '/config', ['methods' => 'POST', 'permission_callback' => [__CLASS__, 'signed_request'], 'callback' => [__CLASS__, 'config']]);
    }

    private static function connector_secret() { return defined('BENNIETAY_CONNECTOR_SECRET') ? (string) BENNIETAY_CONNECTOR_SECRET : ''; }

    public static function signed_request($request) {
        $secret = self::connector_secret();
        $signature = (string) $request->get_header('x-bennietay-signature');
        $timestamp = (string) $request->get_header('x-bennietay-timestamp');
        if ($secret === '' || $signature === '' || !ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) return false;
        $replay_key = 'bt_sig_' . hash('sha256', $signature);
        if (get_transient($replay_key)) return false;
        $expected = hash_hmac('sha256', $timestamp . '.' . $request->get_body(), $secret);
        if (!hash_equals($expected, $signature)) return false;
        set_transient($replay_key, 1, 10 * MINUTE_IN_SECONDS);
        return true;
    }

    private static function outbox() { $items = get_option(self::OUTBOX_OPTION, []); return is_array($items) ? $items : []; }
    private static function save_outbox($items) { update_option(self::OUTBOX_OPTION, array_values($items), false); }

    private static function rate_limited() {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
        $key = 'bt_lead_rate_' . substr(hash('sha256', $ip), 0, 24);
        $count = (int) get_transient($key);
        if ($count >= 10) return true;
        set_transient($key, $count + 1, MINUTE_IN_SECONDS);
        return false;
    }

    public static function lead($request) {
        if (self::rate_limited()) return new WP_Error('rate_limited', 'Please wait before trying again.', ['status' => 429]);
        $payload = $request->get_json_params();
        if (!is_array($payload) || !$payload) $payload = $request->get_params();
        if (!empty($payload['website'])) return new WP_REST_Response(['accepted' => true], 202);
        $email = sanitize_email($payload['email'] ?? '');
        $name = sanitize_text_field($payload['name'] ?? '');
        if (!$email || strlen($name) < 2) return new WP_Error('invalid_lead', 'Name and a valid email are required.', ['status' => 400]);
        $item = ['externalId' => wp_generate_uuid4(), 'websiteId' => defined('BENNIETAY_WEBSITE_ID') ? (string) BENNIETAY_WEBSITE_ID : '', 'name' => $name, 'email' => $email, 'phone' => sanitize_text_field($payload['phone'] ?? ''), 'message' => sanitize_textarea_field($payload['message'] ?? ''), 'sourceUrl' => esc_url_raw($payload['sourceUrl'] ?? home_url('/')), 'queuedAt' => gmdate('c'), 'attempts' => 0];
        if ($item['websiteId'] === '') return new WP_Error('connector_not_configured', 'Lead delivery is not configured.', ['status' => 503]);
        $outbox = self::outbox();
        if (count($outbox) >= 1000) return new WP_Error('lead_queue_full', 'Enquiry storage is temporarily full. Please call or WhatsApp us.', ['status' => 503]);
        $outbox[] = $item; self::save_outbox($outbox); self::flush_outbox();
        return new WP_REST_Response(['accepted' => true, 'reference' => $item['externalId']], 201);
    }

    public static function flush_outbox() {
        $api_url = defined('BENNIETAY_ADMIN_API_URL') ? rtrim((string) BENNIETAY_ADMIN_API_URL, '/') : '';
        $secret = self::connector_secret();
        if ($api_url === '' || $secret === '') return;
        $remaining = [];
        foreach (self::outbox() as $item) {
            if ((int) ($item['attempts'] ?? 0) >= 20) { $remaining[] = $item; continue; }
            $payload = $item; unset($payload['queuedAt'], $payload['attempts'], $payload['lastAttemptAt']);
            $body = wp_json_encode($payload); $timestamp = (string) time();
            $response = wp_remote_post($api_url . '/api/integrations/waas/leads', ['timeout' => 12, 'headers' => ['Content-Type' => 'application/json', 'X-BennieTay-Timestamp' => $timestamp, 'X-BennieTay-Signature' => hash_hmac('sha256', $timestamp . '.' . $body, $secret)], 'body' => $body]);
            $status = is_wp_error($response) ? 0 : (int) wp_remote_retrieve_response_code($response);
            if ($status < 200 || $status >= 300) { $item['attempts'] = (int) ($item['attempts'] ?? 0) + 1; $item['lastAttemptAt'] = gmdate('c'); $remaining[] = $item; }
        }
        self::save_outbox($remaining);
    }

    public static function config($request) {
        $payload = $request->get_json_params();
        update_option(self::CONFIG_OPTION, ['template' => sanitize_text_field($payload['template'] ?? ''), 'cta' => sanitize_text_field($payload['cta'] ?? ''), 'updatedAt' => current_time('mysql', true)], false);
        return rest_ensure_response(['updated' => true]);
    }

    public static function lead_form($attributes = []) {
        $attributes = shortcode_atts(['button' => 'Send enquiry'], $attributes, 'bennietay_lead_form');
        $endpoint = esc_url(rest_url('bennietay/v1/lead')); $button = esc_html($attributes['button']);
        return '<form class="bt-lead-form" data-endpoint="' . $endpoint . '"><input name="name" required autocomplete="name" placeholder="Your name"><input name="email" required type="email" autocomplete="email" placeholder="Email"><input name="phone" autocomplete="tel" placeholder="Phone / WhatsApp"><textarea name="message" required placeholder="How can we help?"></textarea><input class="bt-honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="bt-button" type="submit">' . $button . '</button><p class="bt-form-status" role="status" aria-live="polite"></p></form><script>(function(){document.querySelectorAll(".bt-lead-form").forEach(function(f){if(f.dataset.ready)return;f.dataset.ready="1";f.addEventListener("submit",async function(e){e.preventDefault();var s=f.querySelector(".bt-form-status"),b=f.querySelector("button");b.disabled=true;s.textContent="Sending…";var p=Object.fromEntries(new FormData(f));p.sourceUrl=location.href;try{var r=await fetch(f.dataset.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!r.ok)throw new Error("Unable to send");f.reset();s.textContent="Thank you. Your enquiry has been received."}catch(x){s.textContent="We could not send this yet. Please call or WhatsApp us."}finally{b.disabled=false}})})})();</script>';
    }
}

BennieTay_Managed_Connector::boot();
