<?php
/**
 * Database Setup & Activation Sequence
 * Pak-Munshi Pro — Designed and Developed by Sikandar Hayat Baba
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function munshi_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    // Properties (Buildings)
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_properties (
        id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name        VARCHAR(200) NOT NULL,
        address     TEXT NOT NULL,
        type        VARCHAR(50) NOT NULL DEFAULT 'Residential',
        total_floors INT(4) NOT NULL DEFAULT 1,
        description TEXT,
        status      VARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset;";

    // Units (Flats/Shops per property)
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_units (
        id              BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        property_id     BIGINT(20) UNSIGNED NOT NULL,
        unit_number     VARCHAR(50) NOT NULL,
        floor           INT(4) NOT NULL DEFAULT 0,
        unit_type       VARCHAR(50) NOT NULL DEFAULT 'Flat',
        area_sqft       DECIMAL(10,2),
        rent_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        maintenance_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        water_charges   DECIMAL(12,2) NOT NULL DEFAULT 500.00,
        status          VARCHAR(20) NOT NULL DEFAULT 'Vacant',
        notes           TEXT,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY property_id (property_id)
    ) $charset;";

    // Tenants
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_tenants (
        id               BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        unit_id          BIGINT(20) UNSIGNED NOT NULL,
        full_name        VARCHAR(200) NOT NULL,
        father_name      VARCHAR(200),
        cnic             VARCHAR(20),
        phone            VARCHAR(20) NOT NULL,
        whatsapp         VARCHAR(20),
        email            VARCHAR(100),
        permanent_address TEXT,
        occupation       VARCHAR(100),
        family_members   INT(4) NOT NULL DEFAULT 1,
        security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        agreement_start  DATE NOT NULL,
        agreement_end    DATE,
        advance_months   INT(2) NOT NULL DEFAULT 0,
        status           VARCHAR(20) NOT NULL DEFAULT 'Active',
        notes            TEXT,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY unit_id (unit_id)
    ) $charset;";

    // Invoices (Monthly Bills)
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_invoices (
        id                 BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        tenant_id          BIGINT(20) UNSIGNED NOT NULL,
        invoice_number     VARCHAR(50) NOT NULL,
        billing_month      VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
        due_date           DATE NOT NULL,
        rent_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        electricity_units  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        electricity_rate   DECIMAL(10,2) NOT NULL DEFAULT 25.00,
        electricity_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        water_charges      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        maintenance_fee    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        other_charges      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        other_desc         VARCHAR(200),
        arrears            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        paid_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        balance            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status             VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
        notes              TEXT,
        created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY invoice_number (invoice_number),
        KEY tenant_id (tenant_id),
        KEY billing_month (billing_month)
    ) $charset;";

    // Payments
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_payments (
        id             BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        invoice_id     BIGINT(20) UNSIGNED NOT NULL,
        receipt_number VARCHAR(50) NOT NULL,
        amount         DECIMAL(12,2) NOT NULL,
        paid_date      DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
        reference_no   VARCHAR(100),
        bank_name      VARCHAR(100),
        notes          TEXT,
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY invoice_id (invoice_id)
    ) $charset;";

    // Documents
    $sql[] = "CREATE TABLE {$wpdb->prefix}munshi_documents (
        id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        tenant_id   BIGINT(20) UNSIGNED NOT NULL,
        doc_type    VARCHAR(50) NOT NULL DEFAULT 'CNIC',
        file_name   VARCHAR(255) NOT NULL,
        file_url    TEXT NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY tenant_id (tenant_id)
    ) $charset;";

    foreach ( $sql as $query ) {
        dbDelta( $query );
    }

    update_option( 'munshi_db_version', MUNSHI_VERSION );
}

function munshi_create_dashboard_page() {
    // Check if page already exists
    $existing = get_page_by_path( MUNSHI_SLUG );
    if ( $existing ) {
        update_option( 'munshi_dashboard_page_id', $existing->ID );
        return;
    }

    $page_id = wp_insert_post([
        'post_title'   => 'Pak-Munshi Dashboard',
        'post_name'    => MUNSHI_SLUG,
        'post_content' => '[pak_munshi_app_shell]',
        'post_status'  => 'publish',
        'post_type'    => 'page',
        'post_author'  => 1,
        'comment_status' => 'closed',
    ]);

    if ( $page_id && ! is_wp_error( $page_id ) ) {
        update_option( 'munshi_dashboard_page_id', $page_id );
    }
}
