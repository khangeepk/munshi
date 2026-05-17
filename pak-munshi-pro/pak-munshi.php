<?php
/**
 * Plugin Name:       Pak-Munshi Pro
 * Plugin URI:        https://github.com/samikhans/pak-munshi-pro
 * Description:       Professional Property & Tenant Management Suite for Pakistani landlords. Track buildings, tenants, billing, payments, and generate branded PDF invoices.
 * Version:           1.0.0
 * Author:            Sami Khan - SQ Tech
 * Author URI:        #
 * Text Domain:       pak-munshi-pro
 * License:           GPL v2 or later
 *
 * Designed and Developed by Sami Khan - SQ Tech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Constants ───────────────────────────────────────────────────────────────
define( 'MUNSHI_VERSION',     '1.0.0' );
define( 'MUNSHI_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'MUNSHI_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );
define( 'MUNSHI_SLUG',        'munshi-dashboard' );
define( 'MUNSHI_DEVELOPER',   'Designed and Developed by Sami Khan - SQ Tech' );

// ─── Includes ────────────────────────────────────────────────────────────────
require_once MUNSHI_PLUGIN_DIR . 'includes/db-setup.php';
require_once MUNSHI_PLUGIN_DIR . 'includes/ajax-handlers.php';
require_once MUNSHI_PLUGIN_DIR . 'includes/pdf-generator.php';
require_once MUNSHI_PLUGIN_DIR . 'includes/whatsapp-hook.php';

// ─── Activation Hook ─────────────────────────────────────────────────────────
register_activation_hook( __FILE__, 'munshi_activate' );
function munshi_activate() {
    munshi_create_tables();
    munshi_create_dashboard_page();
    flush_rewrite_rules();
}

// ─── Deactivation Hook ───────────────────────────────────────────────────────
register_deactivation_hook( __FILE__, function() {
    flush_rewrite_rules();
});

// ─── Admin Menu ──────────────────────────────────────────────────────────────
add_action( 'admin_menu', 'munshi_register_menu' );
function munshi_register_menu() {
    add_menu_page(
        'Pak-Munshi Pro',
        'Pak-Munshi Pro',
        'manage_options',
        'pak-munshi-admin',
        'munshi_admin_redirect',
        'dashicons-building',
        25
    );
}

function munshi_admin_redirect() {
    $url = home_url( '/' . MUNSHI_SLUG . '/' );
    echo '<script>window.location.href="' . esc_url( $url ) . '";</script>';
    echo '<p>Redirecting to <a href="' . esc_url( $url ) . '">Pak-Munshi Dashboard</a>...</p>';
}

// ─── Template Redirect (Standalone Shell) ────────────────────────────────────
add_action( 'template_redirect', 'munshi_template_hijack' );
function munshi_template_hijack() {
    if ( ! is_page( MUNSHI_SLUG ) ) return;
    if ( ! is_user_logged_in() ) {
        wp_redirect( wp_login_url( get_permalink() ) );
        exit;
    }
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( __( 'Access denied. You need Administrator privileges to access Pak-Munshi Pro.', 'pak-munshi-pro' ) );
    }
    include MUNSHI_PLUGIN_DIR . 'templates/dashboard.php';
    exit;
}

// ─── Enqueue Assets (for the standalone template only) ───────────────────────
add_action( 'wp_enqueue_scripts', 'munshi_enqueue_assets' );
function munshi_enqueue_assets() {
    if ( ! is_page( MUNSHI_SLUG ) ) return;

    wp_enqueue_script( 'jquery' );
    wp_enqueue_style(
        'munshi-style',
        MUNSHI_PLUGIN_URL . 'assets/css/style.css',
        [],
        MUNSHI_VERSION
    );
    wp_enqueue_script(
        'munshi-app',
        MUNSHI_PLUGIN_URL . 'assets/js/app.js',
        [ 'jquery' ],
        MUNSHI_VERSION,
        true
    );
    wp_localize_script( 'munshi-app', 'munshiAjax', [
        'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
        'nonce'     => wp_create_nonce( 'munshi_nonce' ),
        'pluginUrl' => MUNSHI_PLUGIN_URL,
        'siteUrl'   => home_url(),
    ]);
}

// ─── Shortcode (for manual placement fallback) ────────────────────────────────
add_shortcode( 'pak_munshi_app_shell', function() {
    return '<div id="munshi-app-shell">Loading Pak-Munshi Pro…</div>';
});
