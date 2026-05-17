<?php
/**
 * WhatsApp / SMS Action Hooks
 * Pak-Munshi Pro — Designed and Developed by Sikandar Hayat Baba
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Custom action hook for triggering WhatsApp/SMS alerts.
 * Usage: do_action('munshi_send_whatsapp', $phone, $message, $type)
 */
add_action( 'munshi_send_whatsapp', 'munshi_dispatch_whatsapp', 10, 3 );

function munshi_dispatch_whatsapp( string $phone, string $message, string $type = 'reminder' ) {
    // Sanitize phone number: strip spaces, dashes, enforce +92 prefix
    $phone = preg_replace( '/[\s\-()]/', '', $phone );
    if ( str_starts_with( $phone, '03' ) ) {
        $phone = '+92' . substr( $phone, 1 );
    }
    if ( ! str_starts_with( $phone, '+' ) ) {
        $phone = '+92' . ltrim( $phone, '0' );
    }

    // Try WhatsApp Business API if key is configured
    $api_key    = get_option( 'munshi_wa_api_key', '' );
    $api_url    = get_option( 'munshi_wa_api_url', '' );
    $wa_sent    = false;

    if ( $api_key && $api_url ) {
        $response = wp_remote_post( $api_url, [
            'headers' => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ],
            'body' => wp_json_encode([
                'phone'   => $phone,
                'message' => $message,
                'type'    => $type,
            ]),
            'timeout' => 15,
        ]);

        if ( ! is_wp_error( $response ) && wp_remote_retrieve_response_code( $response ) === 200 ) {
            $wa_sent = true;
            munshi_log_whatsapp( $phone, $message, 'SENT_API' );
        }
    }

    if ( ! $wa_sent ) {
        // Fallback: generate wa.me deep link and log it
        $wa_link = 'https://wa.me/' . ltrim( $phone, '+' ) . '?text=' . rawurlencode( $message );
        munshi_log_whatsapp( $phone, $message, 'LINK_GENERATED', $wa_link );
        return [ 'success' => false, 'wa_link' => $wa_link, 'phone' => $phone ];
    }

    return [ 'success' => true, 'phone' => $phone ];
}

function munshi_log_whatsapp( string $phone, string $message, string $status, string $link = '' ) {
    $logs   = get_option( 'munshi_wa_logs', [] );
    $logs[] = [
        'phone'   => $phone,
        'message' => $message,
        'status'  => $status,
        'link'    => $link,
        'time'    => current_time( 'mysql' ),
    ];
    // Keep last 200 logs
    if ( count( $logs ) > 200 ) {
        $logs = array_slice( $logs, -200 );
    }
    update_option( 'munshi_wa_logs', $logs );
}

// ─── AJAX: Send WhatsApp reminder manually ────────────────────────────────────
add_action( 'wp_ajax_munshi_send_wa_reminder', 'munshi_ajax_send_wa_reminder' );
function munshi_ajax_send_wa_reminder() {
    check_ajax_referer( 'munshi_nonce', 'nonce' );
    if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized', 403 );

    global $wpdb;
    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    if ( ! $invoice_id ) wp_send_json_error( 'Invalid invoice ID' );

    // Fetch invoice + tenant data
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT i.*, t.full_name, t.whatsapp, t.phone, u.unit_number, p.name as property_name
         FROM {$wpdb->prefix}munshi_invoices i
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         WHERE i.id = %d", $invoice_id
    ));

    if ( ! $row ) wp_send_json_error( 'Invoice not found' );

    $phone = $row->whatsapp ?: $row->phone;
    $message = sprintf(
        "Assalam-o-Alaikum %s,\n\nYour rent invoice for *%s* (Unit %s) for *%s* is due.\n\n" .
        "💰 Amount Due: PKR %s\n📅 Due Date: %s\n\n" .
        "Please pay at your earliest convenience.\n\n" .
        "– %s",
        $row->full_name,
        $row->property_name,
        $row->unit_number,
        $row->billing_month,
        number_format( (float)$row->balance, 0 ),
        $row->due_date,
        get_option( 'blogname' )
    );

    $result = munshi_dispatch_whatsapp( $phone, $message, 'rent_reminder' );
    wp_send_json_success( $result );
}
