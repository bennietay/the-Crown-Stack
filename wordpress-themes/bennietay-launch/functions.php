<?php
if (!defined('ABSPATH')) exit;
function bennietay_launch_assets(){wp_enqueue_style('bennietay-launch',get_stylesheet_uri(),[], '1.1.0');wp_enqueue_script('bennietay-launch',get_template_directory_uri().'/assets/interactions.js',[], '1.1.0', true);}
add_action('wp_enqueue_scripts','bennietay_launch_assets');
add_theme_support('title-tag'); add_theme_support('post-thumbnails'); add_theme_support('custom-logo');
function bt_launch_value($key,$fallback=''){ $config=get_option('bennietay_managed_config',[]); return isset($config[$key]) && $config[$key]!=='' ? $config[$key] : get_theme_mod('bt_'.$key,$fallback); }
function bt_launch_list($key,$fallback){ $value=bt_launch_value($key,$fallback); if(is_array($value))return $value; $decoded=json_decode((string)$value,true); return is_array($decoded)?$decoded:$fallback; }
