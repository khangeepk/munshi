<?php
/**
 * All AJAX Endpoints — Secured with nonce + capability checks
 * Pak-Munshi Pro — Designed and Developed by Sikandar Hayat Baba
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Helper ──────────────────────────────────────────────────────────────────
function munshi_verify_request() {
    check_ajax_referer( 'munshi_nonce', 'nonce' );
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_munshi_get_properties',    'munshi_get_properties' );
add_action( 'wp_ajax_munshi_save_property',     'munshi_save_property' );
add_action( 'wp_ajax_munshi_delete_property',   'munshi_delete_property' );
add_action( 'wp_ajax_munshi_get_units',         'munshi_get_units' );
add_action( 'wp_ajax_munshi_save_unit',         'munshi_save_unit' );
add_action( 'wp_ajax_munshi_delete_unit',       'munshi_delete_unit' );

function munshi_get_properties() {
    munshi_verify_request();
    global $wpdb;
    $props = $wpdb->get_results(
        "SELECT p.*, 
            COUNT(u.id) as total_units,
            SUM(CASE WHEN u.status='Occupied' THEN 1 ELSE 0 END) as occupied_units,
            SUM(CASE WHEN u.status='Vacant'   THEN 1 ELSE 0 END) as vacant_units
         FROM {$wpdb->prefix}munshi_properties p
         LEFT JOIN {$wpdb->prefix}munshi_units u ON u.property_id = p.id
         GROUP BY p.id
         ORDER BY p.name ASC"
    );
    wp_send_json_success( $props );
}

function munshi_save_property() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'name'         => sanitize_text_field( $_POST['name'] ),
        'address'      => sanitize_textarea_field( $_POST['address'] ),
        'type'         => sanitize_text_field( $_POST['type'] ?? 'Residential' ),
        'total_floors' => intval( $_POST['total_floors'] ?? 1 ),
        'description'  => sanitize_textarea_field( $_POST['description'] ?? '' ),
        'status'       => sanitize_text_field( $_POST['status'] ?? 'Active' ),
    ];
    if ( ! $data['name'] || ! $data['address'] ) {
        wp_send_json_error( 'Name and address are required.' );
    }
    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_properties", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_properties", $data );
        $id = $wpdb->insert_id;
    }
    wp_send_json_success( [ 'id' => $id, 'message' => 'Property saved successfully.' ] );
}

function munshi_delete_property() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    // Check for active tenants
    $tenants = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}munshi_tenants t
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         WHERE u.property_id = %d AND t.status = 'Active'", $id
    ));
    if ( $tenants > 0 ) {
        wp_send_json_error( 'Cannot delete: Property has active tenants.' );
    }
    $wpdb->delete( "{$wpdb->prefix}munshi_units",     [ 'property_id' => $id ] );
    $wpdb->delete( "{$wpdb->prefix}munshi_properties", [ 'id' => $id ] );
    wp_send_json_success( 'Property deleted.' );
}

function munshi_get_units() {
    munshi_verify_request();
    global $wpdb;
    $property_id = intval( $_POST['property_id'] ?? 0 );
    $where = $property_id ? $wpdb->prepare( 'WHERE u.property_id = %d', $property_id ) : '';
    $units = $wpdb->get_results(
        "SELECT u.*, p.name as property_name, t.full_name as tenant_name, t.id as tenant_id
         FROM {$wpdb->prefix}munshi_units u
         LEFT JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         LEFT JOIN {$wpdb->prefix}munshi_tenants t ON t.unit_id = u.id AND t.status = 'Active'
         $where ORDER BY p.name, u.floor, u.unit_number"
    );
    wp_send_json_success( $units );
}

function munshi_save_unit() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'property_id'     => intval( $_POST['property_id'] ),
        'unit_number'     => sanitize_text_field( $_POST['unit_number'] ),
        'floor'           => intval( $_POST['floor'] ?? 0 ),
        'unit_type'       => sanitize_text_field( $_POST['unit_type'] ?? 'Flat' ),
        'area_sqft'       => floatval( $_POST['area_sqft'] ?? 0 ),
        'rent_amount'     => floatval( $_POST['rent_amount'] ?? 0 ),
        'maintenance_fee' => floatval( $_POST['maintenance_fee'] ?? 0 ),
        'water_charges'   => floatval( $_POST['water_charges'] ?? 500 ),
        'status'          => sanitize_text_field( $_POST['status'] ?? 'Vacant' ),
        'notes'           => sanitize_textarea_field( $_POST['notes'] ?? '' ),
    ];
    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_units", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_units", $data );
        $id = $wpdb->insert_id;
    }
    wp_send_json_success( [ 'id' => $id, 'message' => 'Unit saved.' ] );
}

function munshi_delete_unit() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    $active = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}munshi_tenants WHERE unit_id = %d AND status = 'Active'", $id
    ));
    if ( $active ) wp_send_json_error( 'Unit has an active tenant.' );
    $wpdb->delete( "{$wpdb->prefix}munshi_units", [ 'id' => $id ] );
    wp_send_json_success( 'Unit deleted.' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_munshi_get_tenants',   'munshi_get_tenants' );
add_action( 'wp_ajax_munshi_save_tenant',   'munshi_save_tenant' );
add_action( 'wp_ajax_munshi_delete_tenant', 'munshi_delete_tenant' );

function munshi_get_tenants() {
    munshi_verify_request();
    global $wpdb;
    $tenants = $wpdb->get_results(
        "SELECT t.*, u.unit_number, u.rent_amount, p.name as property_name
         FROM {$wpdb->prefix}munshi_tenants t
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         ORDER BY t.full_name ASC"
    );
    // Flag agreements expiring within 30 days
    $now = time();
    foreach ( $tenants as &$t ) {
        $end   = $t->agreement_end ? strtotime( $t->agreement_end ) : null;
        $t->days_to_expire = $end ? round( ( $end - $now ) / 86400 ) : null;
        $t->expiry_alert   = ( $end && $end <= strtotime( '+30 days' ) && $end >= $now );
    }
    wp_send_json_success( $tenants );
}

function munshi_save_tenant() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'unit_id'          => intval( $_POST['unit_id'] ),
        'full_name'        => sanitize_text_field( $_POST['full_name'] ),
        'father_name'      => sanitize_text_field( $_POST['father_name'] ?? '' ),
        'cnic'             => sanitize_text_field( $_POST['cnic'] ?? '' ),
        'phone'            => sanitize_text_field( $_POST['phone'] ),
        'whatsapp'         => sanitize_text_field( $_POST['whatsapp'] ?? '' ),
        'email'            => sanitize_email( $_POST['email'] ?? '' ),
        'permanent_address'=> sanitize_textarea_field( $_POST['permanent_address'] ?? '' ),
        'occupation'       => sanitize_text_field( $_POST['occupation'] ?? '' ),
        'family_members'   => intval( $_POST['family_members'] ?? 1 ),
        'security_deposit' => floatval( $_POST['security_deposit'] ?? 0 ),
        'agreement_start'  => sanitize_text_field( $_POST['agreement_start'] ),
        'agreement_end'    => sanitize_text_field( $_POST['agreement_end'] ?? '' ) ?: null,
        'advance_months'   => intval( $_POST['advance_months'] ?? 0 ),
        'status'           => sanitize_text_field( $_POST['status'] ?? 'Active' ),
        'notes'            => sanitize_textarea_field( $_POST['notes'] ?? '' ),
    ];
    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_tenants", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_tenants", $data );
        $id = $wpdb->insert_id;
        // Mark unit as Occupied
        $wpdb->update( "{$wpdb->prefix}munshi_units", [ 'status' => 'Occupied' ], [ 'id' => $data['unit_id'] ] );
    }
    wp_send_json_success( [ 'id' => $id, 'message' => 'Tenant saved.' ] );
}

function munshi_delete_tenant() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    $tenant = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}munshi_tenants WHERE id = %d", $id
    ));
    if ( ! $tenant ) wp_send_json_error( 'Tenant not found.' );
    $wpdb->delete( "{$wpdb->prefix}munshi_tenants", [ 'id' => $id ] );
    // Mark unit as Vacant
    $wpdb->update( "{$wpdb->prefix}munshi_units", [ 'status' => 'Vacant' ], [ 'id' => $tenant->unit_id ] );
    wp_send_json_success( 'Tenant removed.' );
}

// ─── Document Upload ──────────────────────────────────────────────────────────
add_action( 'wp_ajax_munshi_upload_document', 'munshi_upload_document' );
function munshi_upload_document() {
    munshi_verify_request();
    if ( empty( $_FILES['file'] ) ) wp_send_json_error( 'No file uploaded.' );
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $attachment_id = media_handle_upload( 'file', 0 );
    if ( is_wp_error( $attachment_id ) ) wp_send_json_error( $attachment_id->get_error_message() );
    global $wpdb;
    $wpdb->insert( "{$wpdb->prefix}munshi_documents", [
        'tenant_id' => intval( $_POST['tenant_id'] ),
        'doc_type'  => sanitize_text_field( $_POST['doc_type'] ?? 'CNIC' ),
        'file_name' => basename( get_attached_file( $attachment_id ) ),
        'file_url'  => wp_get_attachment_url( $attachment_id ),
    ]);
    wp_send_json_success( [
        'doc_id'   => $wpdb->insert_id,
        'file_url' => wp_get_attachment_url( $attachment_id ),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES & BILLING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_munshi_get_invoices',      'munshi_get_invoices' );
add_action( 'wp_ajax_munshi_generate_invoice',  'munshi_generate_invoice' );
add_action( 'wp_ajax_munshi_delete_invoice',    'munshi_delete_invoice' );

function munshi_get_invoices() {
    munshi_verify_request();
    global $wpdb;
    $invoices = $wpdb->get_results(
        "SELECT i.*, t.full_name, t.phone, u.unit_number, p.name as property_name
         FROM {$wpdb->prefix}munshi_invoices i
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         ORDER BY i.created_at DESC
         LIMIT 300"
    );
    wp_send_json_success( $invoices );
}

function munshi_generate_invoice() {
    munshi_verify_request();
    global $wpdb;

    $tenant_id  = intval( $_POST['tenant_id'] );
    $month      = sanitize_text_field( $_POST['billing_month'] ); // YYYY-MM
    $elec_units = floatval( $_POST['electricity_units'] ?? 0 );
    $elec_rate  = floatval( $_POST['electricity_rate'] ?? 25 );
    $other      = floatval( $_POST['other_charges'] ?? 0 );
    $other_desc = sanitize_text_field( $_POST['other_desc'] ?? '' );

    // Check if invoice already exists for this tenant/month
    $existing = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}munshi_invoices WHERE tenant_id = %d AND billing_month = %s",
        $tenant_id, $month
    ));
    if ( $existing ) wp_send_json_error( 'Invoice already exists for this month.' );

    // Get tenant + unit data
    $data = $wpdb->get_row( $wpdb->prepare(
        "SELECT t.*, u.rent_amount, u.maintenance_fee, u.water_charges
         FROM {$wpdb->prefix}munshi_tenants t
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         WHERE t.id = %d", $tenant_id
    ));
    if ( ! $data ) wp_send_json_error( 'Tenant not found.' );

    // Calculate arrears from previous unpaid/partial invoices
    $arrears = (float) $wpdb->get_var( $wpdb->prepare(
        "SELECT COALESCE(SUM(balance),0) FROM {$wpdb->prefix}munshi_invoices
         WHERE tenant_id = %d AND status IN ('Unpaid','Partial')", $tenant_id
    ));

    $elec_amount = $elec_units * $elec_rate;
    $total = $data->rent_amount + $elec_amount + $data->water_charges + $data->maintenance_fee + $other + $arrears;

    // Generate unique invoice number
    $inv_number = 'INV-' . strtoupper( substr( md5( uniqid() ), 0, 8 ) );
    $due_date   = date( 'Y-m-d', strtotime( $month . '-01 +10 days' ) );

    $wpdb->insert( "{$wpdb->prefix}munshi_invoices", [
        'tenant_id'          => $tenant_id,
        'invoice_number'     => $inv_number,
        'billing_month'      => $month,
        'due_date'           => $due_date,
        'rent_amount'        => $data->rent_amount,
        'electricity_units'  => $elec_units,
        'electricity_rate'   => $elec_rate,
        'electricity_amount' => $elec_amount,
        'water_charges'      => $data->water_charges,
        'maintenance_fee'    => $data->maintenance_fee,
        'other_charges'      => $other,
        'other_desc'         => $other_desc,
        'arrears'            => $arrears,
        'total_amount'       => $total,
        'paid_amount'        => 0,
        'balance'            => $total,
        'status'             => 'Unpaid',
    ]);

    $invoice_id = $wpdb->insert_id;

    // Auto-send WhatsApp reminder
    if ( get_option( 'munshi_auto_wa_reminder', 0 ) ) {
        do_action( 'munshi_send_whatsapp', $data->whatsapp ?: $data->phone,
            "Invoice #{$inv_number} generated for {$month}. Amount: PKR " . number_format( $total, 0 ) . ". Due: {$due_date}.",
            'invoice'
        );
    }

    wp_send_json_success( [
        'invoice_id'    => $invoice_id,
        'invoice_number'=> $inv_number,
        'total'         => $total,
        'message'       => 'Invoice generated successfully.',
    ]);
}

function munshi_delete_invoice() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    $wpdb->delete( "{$wpdb->prefix}munshi_payments", [ 'invoice_id' => $id ] );
    $wpdb->delete( "{$wpdb->prefix}munshi_invoices",  [ 'id' => $id ] );
    wp_send_json_success( 'Invoice deleted.' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_munshi_record_payment',  'munshi_record_payment' );
add_action( 'wp_ajax_munshi_get_payments',    'munshi_get_payments' );

function munshi_record_payment() {
    munshi_verify_request();
    global $wpdb;

    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    $amount     = floatval( $_POST['amount'] ?? 0 );
    if ( ! $invoice_id || $amount <= 0 ) wp_send_json_error( 'Invalid payment data.' );

    $invoice = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}munshi_invoices WHERE id = %d", $invoice_id
    ));
    if ( ! $invoice ) wp_send_json_error( 'Invoice not found.' );

    $receipt = 'REC-' . strtoupper( substr( md5( uniqid() ), 0, 6 ) );
    $wpdb->insert( "{$wpdb->prefix}munshi_payments", [
        'invoice_id'     => $invoice_id,
        'receipt_number' => $receipt,
        'amount'         => $amount,
        'paid_date'      => sanitize_text_field( $_POST['paid_date'] ?? date('Y-m-d') ),
        'payment_method' => sanitize_text_field( $_POST['payment_method'] ?? 'Cash' ),
        'reference_no'   => sanitize_text_field( $_POST['reference_no'] ?? '' ),
        'bank_name'      => sanitize_text_field( $_POST['bank_name'] ?? '' ),
        'notes'          => sanitize_textarea_field( $_POST['notes'] ?? '' ),
    ]);

    // Update invoice balance
    $new_paid   = $invoice->paid_amount + $amount;
    $new_balance= $invoice->total_amount - $new_paid;
    $new_status = $new_balance <= 0 ? 'Paid' : ( $new_paid > 0 ? 'Partial' : 'Unpaid' );

    $wpdb->update( "{$wpdb->prefix}munshi_invoices", [
        'paid_amount' => $new_paid,
        'balance'     => max( 0, $new_balance ),
        'status'      => $new_status,
    ], [ 'id' => $invoice_id ]);

    wp_send_json_success([
        'receipt_number' => $receipt,
        'new_balance'    => max( 0, $new_balance ),
        'status'         => $new_status,
        'message'        => 'Payment recorded. Receipt: ' . $receipt,
    ]);
}

function munshi_get_payments() {
    munshi_verify_request();
    global $wpdb;
    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    $where = $invoice_id ? $wpdb->prepare( 'WHERE p.invoice_id = %d', $invoice_id ) : '';
    $payments = $wpdb->get_results(
        "SELECT p.*, i.invoice_number, i.billing_month, t.full_name
         FROM {$wpdb->prefix}munshi_payments p
         JOIN {$wpdb->prefix}munshi_invoices i ON i.id = p.invoice_id
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         $where ORDER BY p.paid_date DESC LIMIT 200"
    );
    wp_send_json_success( $payments );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS / REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_munshi_get_analytics', 'munshi_get_analytics' );
function munshi_get_analytics() {
    munshi_verify_request();
    global $wpdb;

    $year = intval( $_POST['year'] ?? date('Y') );

    // Monthly revenue collected (last 12 months)
    $revenue = $wpdb->get_results( $wpdb->prepare(
        "SELECT DATE_FORMAT(paid_date,'%%Y-%%m') as month, SUM(amount) as collected
         FROM {$wpdb->prefix}munshi_payments
         WHERE YEAR(paid_date) = %d
         GROUP BY month ORDER BY month", $year
    ));

    // Monthly invoiced (billed)
    $billed = $wpdb->get_results( $wpdb->prepare(
        "SELECT billing_month as month, SUM(total_amount) as billed, SUM(balance) as pending
         FROM {$wpdb->prefix}munshi_invoices
         WHERE YEAR(STR_TO_DATE(CONCAT(billing_month,'-01'), '%%Y-%%m-%%d')) = %d
         GROUP BY billing_month ORDER BY billing_month", $year
    ));

    // KPI summary
    $kpi = $wpdb->get_row(
        "SELECT 
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_properties) as total_properties,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_units) as total_units,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_units WHERE status='Occupied') as occupied,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_units WHERE status='Vacant') as vacant,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_tenants WHERE status='Active') as active_tenants,
            (SELECT COALESCE(SUM(balance),0) FROM {$wpdb->prefix}munshi_invoices WHERE status IN ('Unpaid','Partial')) as total_dues,
            (SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}munshi_payments WHERE YEAR(paid_date)=YEAR(NOW())) as yearly_revenue"
    );

    // Expiring agreements (next 30 days)
    $expiring = $wpdb->get_results(
        "SELECT t.full_name, t.phone, t.agreement_end, u.unit_number, p.name as property_name
         FROM {$wpdb->prefix}munshi_tenants t
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         WHERE t.agreement_end BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         AND t.status = 'Active'
         ORDER BY t.agreement_end ASC"
    );

    wp_send_json_success([
        'revenue'   => $revenue,
        'billed'    => $billed,
        'kpi'       => $kpi,
        'expiring'  => $expiring,
        'year'      => $year,
    ]);
}

// ─── Dashboard Init Data ──────────────────────────────────────────────────────
add_action( 'wp_ajax_munshi_dashboard_init', 'munshi_dashboard_init' );
function munshi_dashboard_init() {
    munshi_verify_request();
    global $wpdb;
    $kpi = $wpdb->get_row(
        "SELECT 
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_properties) as properties,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_units WHERE status='Occupied') as occupied,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_units WHERE status='Vacant') as vacant,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_tenants WHERE status='Active') as tenants,
            (SELECT COALESCE(SUM(balance),0) FROM {$wpdb->prefix}munshi_invoices WHERE status IN ('Unpaid','Partial')) as total_dues,
            (SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}munshi_payments WHERE MONTH(paid_date)=MONTH(NOW()) AND YEAR(paid_date)=YEAR(NOW())) as this_month_revenue"
    );
    $recent_payments = $wpdb->get_results(
        "SELECT p.*, i.invoice_number, t.full_name, t.phone
         FROM {$wpdb->prefix}munshi_payments p
         JOIN {$wpdb->prefix}munshi_invoices i ON i.id = p.invoice_id
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         ORDER BY p.created_at DESC LIMIT 5"
    );
    $upcoming_dues = $wpdb->get_results(
        "SELECT i.*, t.full_name, t.phone, u.unit_number, p.name as property_name
         FROM {$wpdb->prefix}munshi_invoices i
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         WHERE i.status IN ('Unpaid','Partial')
         ORDER BY i.due_date ASC LIMIT 5"
    );
    wp_send_json_success([
        'kpi'            => $kpi,
        'recent_payments'=> $recent_payments,
        'upcoming_dues'  => $upcoming_dues,
        'site_name'      => get_bloginfo('name'),
        'site_url'       => home_url(),
    ]);
}

// ─── PDF Download ─────────────────────────────────────────────────────────────
add_action( 'wp_ajax_munshi_download_invoice', 'munshi_download_invoice' );
function munshi_download_invoice() {
    munshi_verify_request();
    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    munshi_generate_pdf_invoice( $invoice_id );
    exit;
}
