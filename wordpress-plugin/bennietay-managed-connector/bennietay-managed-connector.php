<?php
/**
 * Plugin Name: BennieTay Managed Website Connector
 * Description: Secure, minimal bridge between a managed WordPress site and Bennie Business OS.
 * Version: 0.1.0
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) { exit; }
final class BennieTay_Managed_Connector {
    const VERSION = '0.1.0';
    public static function boot() { add_action('rest_api_init', [__CLASS__, 'routes']); }
    public static function routes() {
        register_rest_route('bennietay/v1', '/health', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () { return rest_ensure_response(['ok' => true, 'pluginVersion' => self::VERSION, 'wordpressVersion' => get_bloginfo('version'), 'siteUrl' => home_url('/')]); }]);
        register_rest_route('bennietay/v1', '/lead', ['methods' => 'POST', 'permission_callback' => [__CLASS__, 'signed_request'], 'callback' => [__CLASS__, 'lead']]);
        register_rest_route('bennietay/v1', '/config', ['methods' => 'POST', 'permission_callback' => [__CLASS__, 'signed_request'], 'callback' => [__CLASS__, 'config']]);
    }
    public static function signed_request($request) {
        $secret = defined('BENNIETAY_CONNECTOR_SECRET') ? (string) BENNIETAY_CONNECTOR_SECRET : '';
        $signature = (string) $request->get_header('x-bennietay-signature');
        return $secret !== '' && $signature !== '' && hash_equals(hash_hmac('sha256', $request->get_body(), $secret), $signature);
    }
    public static function lead($request) {
        $payload = $request->get_json_params(); $email = sanitize_email($payload['email'] ?? '');
        if (!$email || empty($payload['name'])) return new WP_Error('invalid_lead', 'Name and email are required', ['status' => 400]);
        do_action('bennietay_connector_lead', ['name' => sanitize_text_field($payload['name']), 'email' => $email, 'phone' => sanitize_text_field($payload['phone'] ?? ''), 'message' => sanitize_textarea_field($payload['message'] ?? '')]);
        return new WP_REST_Response(['accepted' => true], 202);
    }
    public static function config($request) {
        $payload = $request->get_json_params(); update_option('bennietay_managed_config', ['template' => sanitize_text_field($payload['template'] ?? ''), 'cta' => sanitize_text_field($payload['cta'] ?? ''), 'updatedAt' => current_time('mysql', true)], false);
        return rest_ensure_response(['updated' => true]);
    }
}
BennieTay_Managed_Connector::boot();
