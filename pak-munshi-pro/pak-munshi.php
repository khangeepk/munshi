<?php
/**
 * Plugin Name:       Pak-Munshi Pro
 * Plugin URI:        https://pakmunshi.com
 * Description:       Hierarchical Role-Based Multi-Tenant SaaS core system for PakMunshi Pro (Lawyer Case Management Suite).
 * Version:           1.0.0
 * Author:            Sami Khan - SQ Tech
 * Author URI:        #
 * Text Domain:       pak-munshi-saas
 * License:           GPL v2 or later
 *
 * Designed and Developed by Sami Khan - SQ Tech
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Global Constants
define( 'MUNSHI_VERSION', '1.0.0' );
define( 'MUNSHI_DEVELOPER', 'Designed and Developed by Sami Khan - SQ Tech' );
define( 'MUNSHI_SLUG', 'dashboard' );

// Include necessary plugin modules
require_once plugin_dir_path( __FILE__ ) . 'includes/db-setup.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/ajax-handlers.php';

/**
 * Register Activation Hooks
 */
register_activation_hook( __FILE__, 'pakmunshi_plugin_activate' );
function pakmunshi_plugin_activate() {
    munshi_create_tables();
    munshi_create_dashboard_page();
    flush_rewrite_rules();
}

/**
 * Register Deactivation Hooks
 */
register_deactivation_hook( __FILE__, 'pakmunshi_plugin_deactivate' );
function pakmunshi_plugin_deactivate() {
    flush_rewrite_rules();
}

/**
 * Enqueue Dashboard Assets
 */
add_action( 'wp_enqueue_scripts', 'pakmunshi_enqueue_dashboard_assets' );
function pakmunshi_enqueue_dashboard_assets() {
    // We only enqueue these on the dashboard page
    if ( is_page( MUNSHI_SLUG ) ) {
        wp_enqueue_style(
            'munshi-style',
            plugins_url( 'assets/css/style.css', __FILE__ ),
            array(),
            MUNSHI_VERSION
        );

        wp_enqueue_script(
            'munshi-app',
            plugins_url( 'assets/js/app.js', __FILE__ ),
            array(),
            MUNSHI_VERSION,
            true
        );

        // Localize script to pass live AJAX endpoints & secure token
        wp_localize_script( 'munshi-app', 'munshi_ajax', array(
            'ajax_url' => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'munshi_nonce' )
        ));
    }
}

/**
 * Theme Synchronization: Intercepts request routing for the /dashboard slug,
 * completely bypassing Astra Pro headers/footers and loading our standalone template.
 */
add_action( 'template_redirect', 'pakmunshi_dashboard_template_redirect' );
function pakmunshi_dashboard_template_redirect() {
    if ( ! is_page( MUNSHI_SLUG ) ) {
        return;
    }

    if ( ! is_user_logged_in() ) {
        wp_redirect( wp_login_url( get_permalink() ) );
        exit;
    }

    // Bypass standard theme wrapping templates
    status_header( 200 );
    
    // Load the standalone dashboard layout
    $template_path = plugin_dir_path( __FILE__ ) . 'templates/dashboard.php';
    if ( file_exists( $template_path ) ) {
        include $template_path;
    } else {
        wp_die( 'Dashboard template not found in plugin templates folder.' );
    }
    exit;
}

/**
 * Live Server Cleanup: Automatically deletes duplicate 'pakmunshi' and copy folders (e.g. pak-munshi-pro-1)
 */
add_action( 'admin_init', 'pakmunshi_plugin_cleanup_duplicates' );
function pakmunshi_plugin_cleanup_duplicates() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $plugin_dir = WP_PLUGIN_DIR;
    $items = scandir( $plugin_dir );
    
    foreach ( $items as $item ) {
        if ( $item === '.' || $item === '..' ) {
            continue;
        }
        
        $path = $plugin_dir . '/' . $item;
        if ( ! is_dir( $path ) ) {
            continue;
        }

        // Detect and clean up duplicates
        $is_duplicate = false;
        $normalized_item = strtolower( $item );
        
        if ( $normalized_item === 'pakmunshi' ) {
            $is_duplicate = true;
        } elseif ( strpos( $normalized_item, 'pakmunshi-' ) === 0 ) {
            $is_duplicate = true;
        } elseif ( strpos( $normalized_item, 'pak-munshi-pro-' ) === 0 ) {
            $is_duplicate = true;
        }

        if ( $is_duplicate ) {
            pakmunshi_plugin_rrmdir( $path );
        }
    }
}

function pakmunshi_plugin_rrmdir( $dir ) {
    if ( is_dir( $dir ) ) {
        $objects = scandir( $dir );
        foreach ( $objects as $object ) {
            if ( $object != "." && $object != ".." ) {
                if ( is_dir( $dir . "/" . $object ) && ! is_link( $dir . "/" . $object ) ) {
                    pakmunshi_plugin_rrmdir( $dir . "/" . $object );
                } else {
                    unlink( $dir . "/" . $object );
                }
            }
        }
        rmdir( $dir );
    }
}
