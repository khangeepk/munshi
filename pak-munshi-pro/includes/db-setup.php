<?php
/**
 * Database Setup & Activation Sequence (Lawyer Management System)
 * Designed and Developed by Sami Khan - SQ Tech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function munshi_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $sql = array();

    // 1. Clients
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_clients (
        id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name        VARCHAR(200) NOT NULL,
        email       VARCHAR(100) DEFAULT NULL,
        phone       VARCHAR(20) NOT NULL,
        cnic        VARCHAR(20) DEFAULT NULL,
        address     TEXT DEFAULT NULL,
        whatsapp    VARCHAR(20) DEFAULT NULL,
        notes       TEXT DEFAULT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset;";

    // 2. Cases
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_cases (
        id                BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        client_id         BIGINT(20) UNSIGNED NOT NULL,
        case_title        VARCHAR(255) NOT NULL,
        case_number       VARCHAR(100) NOT NULL,
        case_type         VARCHAR(100) NOT NULL,
        court_name        VARCHAR(200) NOT NULL,
        judge_name        VARCHAR(200) DEFAULT NULL,
        opposite_party    VARCHAR(200) NOT NULL,
        opposite_counsel  VARCHAR(200) DEFAULT NULL,
        fir_number        VARCHAR(50) DEFAULT NULL,
        police_station    VARCHAR(100) DEFAULT NULL,
        description       TEXT DEFAULT NULL,
        internal_notes    TEXT DEFAULT NULL,
        status            VARCHAR(50) NOT NULL DEFAULT 'ONGOING',
        priority          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        next_hearing_date DATETIME DEFAULT NULL,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY client_id (client_id)
    ) $charset;";

    // 3. Hearings
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_hearings (
        id                BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        case_id           BIGINT(20) UNSIGNED NOT NULL,
        hearing_date      DATE NOT NULL,
        hearing_time      VARCHAR(20) DEFAULT NULL,
        court_name        VARCHAR(200) NOT NULL,
        purpose           VARCHAR(255) NOT NULL,
        status            VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
        remarks           TEXT DEFAULT NULL,
        next_hearing_date DATE DEFAULT NULL,
        order_summary     TEXT DEFAULT NULL,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY case_id (case_id)
    ) $charset;";

    // 4. Tasks
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_tasks (
        id           BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        case_id      BIGINT(20) UNSIGNED DEFAULT NULL,
        title        VARCHAR(200) NOT NULL,
        description  TEXT DEFAULT NULL,
        status       VARCHAR(50) NOT NULL DEFAULT 'TODO',
        priority     VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        due_date     DATE DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY case_id (case_id)
    ) $charset;";

    // 5. Invoices (Legal Fees)
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_invoices (
        id             BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        client_id      BIGINT(20) UNSIGNED NOT NULL,
        case_id        BIGINT(20) UNSIGNED DEFAULT NULL,
        invoice_number VARCHAR(50) NOT NULL,
        amount         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        discount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        paid_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        balance        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status         VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
        due_date       DATE DEFAULT NULL,
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY invoice_number (invoice_number),
        KEY client_id (client_id)
    ) $charset;";

    // 6. Payments
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_payments (
        id             BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_id     BIGINT(20) UNSIGNED NOT NULL,
        receipt_number VARCHAR(50) NOT NULL,
        amount         DECIMAL(12,2) NOT NULL,
        paid_date      DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
        reference_no   VARCHAR(100) DEFAULT NULL,
        bank_name      VARCHAR(100) DEFAULT NULL,
        notes          TEXT DEFAULT NULL,
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY invoice_id (invoice_id)
    ) $charset;";

    // 7. Documents (Legal Proofs/Evidence)
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_documents (
        id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        case_id     BIGINT(20) UNSIGNED DEFAULT NULL,
        client_id   BIGINT(20) UNSIGNED DEFAULT NULL,
        doc_type    VARCHAR(50) NOT NULL DEFAULT 'Evidence',
        file_name   VARCHAR(255) NOT NULL,
        file_url    TEXT NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset;";

    foreach ( $sql as $query ) {
        dbDelta( $query );
    }

    update_option( 'munshi_db_version', '1.0.0' );
}

function munshi_create_dashboard_page() {
    $slug = 'dashboard';
    $existing = get_page_by_path( $slug );
    if ( $existing ) {
        update_option( 'munshi_dashboard_page_id', $existing->ID );
        return;
    }

    $page_id = wp_insert_post([
        'post_title'   => 'Pak-Munshi Dashboard',
        'post_name'    => $slug,
        'post_content' => '<!-- PakMunshi Dashboard Shell -->',
        'post_status'  => 'publish',
        'post_type'    => 'page',
        'post_author'  => 1,
        'comment_status' => 'closed',
    ]);

    if ( $page_id && ! is_wp_error( $page_id ) ) {
        update_option( 'munshi_dashboard_page_id', $page_id );
    }
}
