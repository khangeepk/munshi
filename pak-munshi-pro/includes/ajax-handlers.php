<?php
/**
 * All AJAX Endpoints for Lawyer Case Management System
 * Designed and Developed by Sami Khan - SQ Tech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Helper: Verify request authority and security nonce ──────────────────────
function munshi_verify_request() {
    check_ajax_referer( 'munshi_nonce', 'nonce' );
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_dashboard_init', 'munshi_dashboard_init' );
function munshi_dashboard_init() {
    munshi_verify_request();
    global $wpdb;

    // Fetch KPIs
    $kpi = $wpdb->get_row(
        "SELECT 
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE status != 'CLOSED') as active_cases,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_hearings WHERE status='SCHEDULED') as pending_hearings,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_clients) as clients,
            (SELECT COALESCE(SUM(balance),0) FROM {$wpdb->prefix}munshi_invoices WHERE status IN ('Unpaid','Partial')) as total_dues,
            (SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}munshi_payments WHERE MONTH(paid_date)=MONTH(NOW()) AND YEAR(paid_date)=YEAR(NOW())) as this_month_revenue"
    );

    // Fetch Recent Payments
    $recent_payments = $wpdb->get_results(
        "SELECT p.*, i.invoice_number, c.name as client_name
         FROM {$wpdb->prefix}munshi_payments p
         JOIN {$wpdb->prefix}munshi_invoices i ON i.id = p.invoice_id
         JOIN {$wpdb->prefix}munshi_clients c ON c.id = i.client_id
         ORDER BY p.created_at DESC LIMIT 5"
    );

    // Fetch Upcoming Hearings
    $upcoming_hearings = $wpdb->get_results(
        "SELECT h.*, c.case_title, c.case_number
         FROM {$wpdb->prefix}munshi_hearings h
         JOIN {$wpdb->prefix}munshi_cases c ON c.id = h.case_id
         WHERE h.hearing_date >= CURDATE()
         ORDER BY h.hearing_date ASC, h.hearing_time ASC LIMIT 5"
    );

    wp_send_json_success([
        'kpi'             => $kpi,
        'recent_payments' => $recent_payments,
        'upcoming_dues'   => $upcoming_hearings, // mapped parameter name for JS compatibility
        'site_name'       => get_bloginfo('name'),
        'site_url'        => home_url(),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CLIENTS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_clients',   'munshi_get_clients' );
add_action( 'wp_ajax_munshi_save_client',   'munshi_save_client' );
add_action( 'wp_ajax_munshi_delete_client', 'munshi_delete_client' );

function munshi_get_clients() {
    munshi_verify_request();
    global $wpdb;
    $clients = $wpdb->get_results(
        "SELECT c.*, 
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE client_id = c.id) as total_cases,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE client_id = c.id AND status = 'ONGOING') as active_cases
         FROM {$wpdb->prefix}munshi_clients c
         ORDER BY c.name ASC"
    );
    wp_send_json_success( $clients );
}

function munshi_save_client() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'name'     => sanitize_text_field( $_POST['name'] ),
        'email'    => sanitize_email( $_POST['email'] ?? '' ),
        'phone'    => sanitize_text_field( $_POST['phone'] ),
        'cnic'     => sanitize_text_field( $_POST['cnic'] ?? '' ),
        'address'  => sanitize_textarea_field( $_POST['address'] ?? '' ),
        'whatsapp' => sanitize_text_field( $_POST['whatsapp'] ?? '' ),
        'notes'    => sanitize_textarea_field( $_POST['notes'] ?? '' ),
    ];

    if ( empty($data['name']) || empty($data['phone']) ) {
        wp_send_json_error( 'Name and Phone are required.' );
    }

    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_clients", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_clients", $data );
        $id = $wpdb->insert_id;
    }
    wp_send_json_success( [ 'id' => $id, 'message' => 'Client saved successfully.' ] );
}

function munshi_delete_client() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    
    // Check for active cases
    $cases = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE client_id = %d AND status != 'CLOSED'", $id
    ));
    if ( $cases > 0 ) {
        wp_send_json_error( 'Cannot delete: Client has active court cases.' );
    }
    
    $wpdb->delete( "{$wpdb->prefix}munshi_clients", [ 'id' => $id ] );
    wp_send_json_success( 'Client deleted.' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CASES SECTION
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_cases',   'munshi_get_cases' );
add_action( 'wp_ajax_munshi_save_case',   'munshi_save_case' );
add_action( 'wp_ajax_munshi_delete_case', 'munshi_delete_case' );

function munshi_get_cases() {
    munshi_verify_request();
    global $wpdb;
    $cases = $wpdb->get_results(
        "SELECT c.*, cl.name as client_name, cl.phone as client_phone
         FROM {$wpdb->prefix}munshi_cases c
         JOIN {$wpdb->prefix}munshi_clients cl ON cl.id = c.client_id
         ORDER BY c.next_hearing_date ASC, c.case_title ASC"
    );
    wp_send_json_success( $cases );
}

function munshi_save_case() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'client_id'        => intval( $_POST['client_id'] ),
        'case_title'       => sanitize_text_field( $_POST['case_title'] ),
        'case_number'      => sanitize_text_field( $_POST['case_number'] ),
        'case_type'        => sanitize_text_field( $_POST['case_type'] ),
        'court_name'       => sanitize_text_field( $_POST['court_name'] ),
        'judge_name'       => sanitize_text_field( $_POST['judge_name'] ?? '' ),
        'opposite_party'   => sanitize_text_field( $_POST['opposite_party'] ),
        'opposite_counsel' => sanitize_text_field( $_POST['opposite_counsel'] ?? '' ),
        'fir_number'       => sanitize_text_field( $_POST['fir_number'] ?? '' ),
        'police_station'   => sanitize_text_field( $_POST['police_station'] ?? '' ),
        'description'      => sanitize_textarea_field( $_POST['description'] ?? '' ),
        'internal_notes'   => sanitize_textarea_field( $_POST['internal_notes'] ?? '' ),
        'status'           => sanitize_text_field( $_POST['status'] ?? 'ONGOING' ),
        'priority'         => sanitize_text_field( $_POST['priority'] ?? 'MEDIUM' ),
    ];

    if ( ! empty($_POST['next_hearing_date']) ) {
        $data['next_hearing_date'] = sanitize_text_field($_POST['next_hearing_date']);
    }

    if ( empty($data['client_id']) || empty($data['case_title']) || empty($data['case_number']) ) {
        wp_send_json_error( 'Client, Case Title, and Case Number are required.' );
    }

    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_cases", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_cases", $data );
        $id = $wpdb->insert_id;
    }
    wp_send_json_success( [ 'id' => $id, 'message' => 'Case saved successfully.' ] );
}

function munshi_delete_case() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    
    $wpdb->delete( "{$wpdb->prefix}munshi_hearings",  [ 'case_id' => $id ] );
    $wpdb->delete( "{$wpdb->prefix}munshi_tasks",     [ 'case_id' => $id ] );
    $wpdb->delete( "{$wpdb->prefix}munshi_cases",     [ 'id' => $id ] );
    wp_send_json_success( 'Case deleted.' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. HEARINGS (COURT DIARY) SECTION
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_hearings',   'munshi_get_hearings' );
add_action( 'wp_ajax_munshi_save_hearing',   'munshi_save_hearing' );
add_action( 'wp_ajax_munshi_delete_hearing', 'munshi_delete_hearing' );

function munshi_get_hearings() {
    munshi_verify_request();
    global $wpdb;
    $case_id = intval( $_POST['case_id'] ?? 0 );
    $where = $case_id ? $wpdb->prepare( 'WHERE h.case_id = %d', $case_id ) : '';
    
    $hearings = $wpdb->get_results(
        "SELECT h.*, c.case_title, c.case_number, cl.name as client_name, cl.phone as client_phone
         FROM {$wpdb->prefix}munshi_hearings h
         JOIN {$wpdb->prefix}munshi_cases c ON c.id = h.case_id
         JOIN {$wpdb->prefix}munshi_clients cl ON cl.id = c.client_id
         $where 
         ORDER BY h.hearing_date DESC, h.hearing_time DESC"
    );
    wp_send_json_success( $hearings );
}

function munshi_save_hearing() {
    munshi_verify_request();
    global $wpdb;
    $id   = intval( $_POST['id'] ?? 0 );
    $data = [
        'case_id'           => intval( $_POST['case_id'] ),
        'hearing_date'      => sanitize_text_field( $_POST['hearing_date'] ),
        'hearing_time'      => sanitize_text_field( $_POST['hearing_time'] ?? '' ),
        'court_name'        => sanitize_text_field( $_POST['court_name'] ),
        'purpose'           => sanitize_text_field( $_POST['purpose'] ),
        'status'            => sanitize_text_field( $_POST['status'] ?? 'SCHEDULED' ),
        'remarks'           => sanitize_textarea_field( $_POST['remarks'] ?? '' ),
        'next_hearing_date' => sanitize_text_field( $_POST['next_hearing_date'] ?? '' ) ?: null,
        'order_summary'     => sanitize_textarea_field( $_POST['order_summary'] ?? '' ),
    ];

    if ( empty($data['case_id']) || empty($data['hearing_date']) || empty($data['court_name']) ) {
        wp_send_json_error( 'Case, Hearing Date, and Court Name are required.' );
    }

    if ( $id ) {
        $wpdb->update( "{$wpdb->prefix}munshi_hearings", $data, [ 'id' => $id ] );
    } else {
        $wpdb->insert( "{$wpdb->prefix}munshi_hearings", $data );
        $id = $wpdb->insert_id;
    }

    // Sync Case next hearing date
    $next_date = $data['next_hearing_date'] ? $data['next_hearing_date'] . ' 00:00:00' : null;
    $wpdb->update( "{$wpdb->prefix}munshi_cases", [ 'next_hearing_date' => $next_date ], [ 'id' => $data['case_id'] ] );

    wp_send_json_success( [ 'id' => $id, 'message' => 'Hearing saved.' ] );
}

function munshi_delete_hearing() {
    munshi_verify_request();
    global $wpdb;
    $id = intval( $_POST['id'] ?? 0 );
    $wpdb->delete( "{$wpdb->prefix}munshi_hearings", [ 'id' => $id ] );
    wp_send_json_success( 'Hearing deleted.' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BILLING & INVOICES
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_invoices',      'munshi_get_invoices' );
add_action( 'wp_ajax_munshi_generate_invoice',  'munshi_generate_invoice' );
add_action( 'wp_ajax_munshi_delete_invoice',    'munshi_delete_invoice' );

function munshi_get_invoices() {
    munshi_verify_request();
    global $wpdb;
    $invoices = $wpdb->get_results(
        "SELECT i.*, cl.name as client_name, cl.phone as client_phone, c.case_title, c.case_number
         FROM {$wpdb->prefix}munshi_invoices i
         JOIN {$wpdb->prefix}munshi_clients cl ON cl.id = i.client_id
         LEFT JOIN {$wpdb->prefix}munshi_cases c ON c.id = i.case_id
         ORDER BY i.created_at DESC"
    );
    wp_send_json_success( $invoices );
}

function munshi_generate_invoice() {
    munshi_verify_request();
    global $wpdb;

    $client_id = intval( $_POST['tenant_id'] ); // mapped parameter name for JS compatibility
    $case_id   = intval( $_POST['case_id'] ?? 0 );
    $amount    = floatval( $_POST['amount'] ?? 0 );
    $discount  = floatval( $_POST['discount'] ?? 0 );
    $due_date  = sanitize_text_field( $_POST['due_date'] ?? date('Y-m-d', strtotime('+7 days')) );

    if ( ! $client_id || $amount <= 0 ) {
        wp_send_json_error( 'Valid Client and Amount are required.' );
    }

    $total = max(0, $amount - $discount);
    $inv_number = 'INV-' . strtoupper( substr( md5( uniqid() ), 0, 8 ) );

    $wpdb->insert( "{$wpdb->prefix}munshi_invoices", [
        'client_id'      => $client_id,
        'case_id'        => $case_id ?: null,
        'invoice_number' => $inv_number,
        'amount'         => $amount,
        'discount'       => $discount,
        'total_amount'   => $total,
        'paid_amount'    => 0,
        'balance'        => $total,
        'status'         => 'Unpaid',
        'due_date'       => $due_date,
    ]);

    $invoice_id = $wpdb->insert_id;
    wp_send_json_success( [
        'invoice_id'     => $invoice_id,
        'invoice_number' => $inv_number,
        'total'          => $total,
        'message'        => 'Invoice generated successfully.',
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
// 6. PAYMENTS RECORDING
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_payments',    'munshi_get_payments' );
add_action( 'wp_ajax_munshi_record_payment',  'munshi_record_payment' );

function munshi_get_payments() {
    munshi_verify_request();
    global $wpdb;
    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    $where = $invoice_id ? $wpdb->prepare( 'WHERE p.invoice_id = %d', $invoice_id ) : '';
    
    $payments = $wpdb->get_results(
        "SELECT p.*, i.invoice_number, cl.name as client_name
         FROM {$wpdb->prefix}munshi_payments p
         JOIN {$wpdb->prefix}munshi_invoices i ON i.id = p.invoice_id
         JOIN {$wpdb->prefix}munshi_clients cl ON cl.id = i.client_id
         $where ORDER BY p.paid_date DESC LIMIT 200"
    );
    wp_send_json_success( $payments );
}

function munshi_record_payment() {
    munshi_verify_request();
    global $wpdb;

    $invoice_id = intval( $_POST['invoice_id'] ?? 0 );
    $amount     = floatval( $_POST['amount'] ?? 0 );
    if ( ! $invoice_id || $amount <= 0 ) {
        wp_send_json_error( 'Invalid payment amount or invoice.' );
    }

    $invoice = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}munshi_invoices WHERE id = %d", $invoice_id
    ));
    if ( ! $invoice ) {
        wp_send_json_error( 'Invoice not found.' );
    }

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

    // Update invoice ledger
    $new_paid   = $invoice->paid_amount + $amount;
    $new_balance= max(0, $invoice->total_amount - $new_paid);
    $new_status = $new_balance <= 0 ? 'Paid' : ( $new_paid > 0 ? 'Partial' : 'Unpaid' );

    $wpdb->update( "{$wpdb->prefix}munshi_invoices", [
        'paid_amount' => $new_paid,
        'balance'     => $new_balance,
        'status'      => $new_status,
    ], [ 'id' => $invoice_id ]);

    wp_send_json_success([
        'receipt_number' => $receipt,
        'new_balance'    => $new_balance,
        'status'         => $new_status,
        'message'        => 'Payment recorded. Receipt: ' . $receipt,
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ANALYTICS & REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
add_action( 'wp_ajax_munshi_get_analytics', 'munshi_get_analytics' );
function munshi_get_analytics() {
    munshi_verify_request();
    global $wpdb;

    $year = intval( $_POST['year'] ?? date('Y') );

    // Monthly revenue collected
    $revenue = $wpdb->get_results( $wpdb->prepare(
        "SELECT DATE_FORMAT(paid_date,'%%Y-%%m') as month, SUM(amount) as collected
         FROM {$wpdb->prefix}munshi_payments
         WHERE YEAR(paid_date) = %d
         GROUP BY month ORDER BY month", $year
    ));

    // Monthly billed fees
    $billed = $wpdb->get_results( $wpdb->prepare(
        "SELECT DATE_FORMAT(created_at,'%%Y-%%m') as month, SUM(total_amount) as billed
         FROM {$wpdb->prefix}munshi_invoices
         WHERE YEAR(created_at) = %d
         GROUP BY month ORDER BY month", $year
    ));

    // General KPI reports
    $kpi = $wpdb->get_row(
        "SELECT 
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE status != 'CLOSED') as active_cases,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_cases WHERE status = 'CLOSED') as closed_cases,
            (SELECT COUNT(*) FROM {$wpdb->prefix}munshi_clients) as clients,
            (SELECT COALESCE(SUM(balance),0) FROM {$wpdb->prefix}munshi_invoices WHERE status IN ('Unpaid','Partial')) as total_dues,
            (SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}munshi_payments WHERE YEAR(paid_date)=YEAR(NOW())) as yearly_revenue"
    );

    // Upcoming critical hearings (next 30 days)
    $expiring = $wpdb->get_results(
        "SELECT h.*, c.case_title, c.case_number, cl.name as client_name
         FROM {$wpdb->prefix}munshi_hearings h
         JOIN {$wpdb->prefix}munshi_cases c ON c.id = h.case_id
         JOIN {$wpdb->prefix}munshi_clients cl ON cl.id = c.client_id
         WHERE h.hearing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         ORDER BY h.hearing_date ASC, h.hearing_time ASC"
    );

    wp_send_json_success([
        'revenue'   => $revenue,
        'billed'    => $billed,
        'kpi'       => $kpi,
        'expiring'  => $expiring, // Mapped for JS chart compatibility
        'year'      => $year,
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LEGAL EVIDENCE DOCUMENT UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
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
        'case_id'   => intval( $_POST['case_id'] ?? 0 ) ?: null,
        'client_id' => intval( $_POST['tenant_id'] ?? 0 ) ?: null, // mapped param for compatibility
        'doc_type'  => sanitize_text_field( $_POST['doc_type'] ?? 'Evidence' ),
        'file_name' => basename( get_attached_file( $attachment_id ) ),
        'file_url'  => wp_get_attachment_url( $attachment_id ),
    ]);

    wp_send_json_success( [
        'doc_id'   => $wpdb->insert_id,
        'file_url' => wp_get_attachment_url( $attachment_id ),
    ]);
}
