<?php
/**
 * PDF Invoice Generator using FPDF
 * Pak-Munshi Pro — Designed and Developed by Sikandar Hayat Baba
 *
 * FPDF is bundled or can be installed via:
 *   composer require setasign/fpdf
 * or download fpdf.php from http://www.fpdf.org/ and place in /includes/lib/fpdf.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function munshi_generate_pdf_invoice( int $invoice_id, bool $download = true ): void {
    global $wpdb;

    // Fetch all invoice data
    $inv = $wpdb->get_row( $wpdb->prepare(
        "SELECT i.*, t.full_name, t.cnic, t.phone, t.permanent_address,
                u.unit_number, u.floor, u.unit_type,
                p.name as property_name, p.address as property_address
         FROM {$wpdb->prefix}munshi_invoices i
         JOIN {$wpdb->prefix}munshi_tenants t ON t.id = i.tenant_id
         JOIN {$wpdb->prefix}munshi_units u ON u.id = t.unit_id
         JOIN {$wpdb->prefix}munshi_properties p ON p.id = u.property_id
         WHERE i.id = %d", $invoice_id
    ));

    if ( ! $inv ) {
        wp_die( 'Invoice not found.' );
    }

    $payments = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}munshi_payments WHERE invoice_id = %d ORDER BY paid_date ASC",
        $invoice_id
    ));

    // ── FPDF Library check ────────────────────────────────────────────────────
    $fpdf_path = MUNSHI_PLUGIN_DIR . 'includes/lib/fpdf.php';
    if ( ! file_exists( $fpdf_path ) ) {
        // Fallback: Generate HTML invoice if FPDF not installed
        munshi_generate_html_invoice( $inv, $payments, $download );
        return;
    }

    require_once $fpdf_path;

    $pdf = new FPDF( 'P', 'mm', 'A4' );
    $pdf->AddPage();
    $pdf->SetMargins( 15, 15, 15 );
    $pdf->SetAutoPageBreak( true, 15 );

    $primary = [ 30, 64, 175 ];   // Blue
    $dark    = [ 15, 23, 42 ];    // Slate dark
    $gray    = [ 100, 116, 139 ]; // Slate gray
    $light   = [ 241, 245, 249 ]; // Light bg

    // ── Header ────────────────────────────────────────────────────────────────
    $pdf->SetFillColor( ...$primary );
    $pdf->Rect( 0, 0, 210, 35, 'F' );
    $pdf->SetTextColor( 255, 255, 255 );
    $pdf->SetFont( 'Arial', 'B', 22 );
    $pdf->SetY( 8 );
    $pdf->Cell( 0, 10, get_bloginfo('name') ?: 'Pak-Munshi Pro', 0, 1, 'C' );
    $pdf->SetFont( 'Arial', '', 10 );
    $pdf->Cell( 0, 6, 'Property & Tenant Management', 0, 1, 'C' );
    $pdf->SetY( 40 );

    // ── Invoice Title ─────────────────────────────────────────────────────────
    $pdf->SetTextColor( ...$dark );
    $pdf->SetFont( 'Arial', 'B', 16 );
    $pdf->Cell( 0, 8, 'RENT INVOICE', 0, 1, 'C' );
    $pdf->SetFont( 'Arial', '', 10 );
    $pdf->SetTextColor( ...$gray );
    $pdf->Cell( 0, 5, 'Invoice # ' . $inv->invoice_number . '   |   Month: ' . $inv->billing_month . '   |   Due: ' . $inv->due_date, 0, 1, 'C' );
    $pdf->Ln( 4 );

    // ── Tenant Info Box ───────────────────────────────────────────────────────
    $pdf->SetFillColor( ...$light );
    $pdf->SetDrawColor( 200, 210, 220 );
    $pdf->RoundedRect( 15, $pdf->GetY(), 85, 42, 3, 'DF' );
    $pdf->SetX( 18 ); $pdf->SetY( $pdf->GetY() + 3 );
    $pdf->SetFont( 'Arial', 'B', 9 ); $pdf->SetTextColor( ...$gray );
    $pdf->Cell( 0, 5, 'TENANT DETAILS', 0, 1 );
    $pdf->SetFont( 'Arial', '', 9 ); $pdf->SetTextColor( ...$dark );
    $pdf->SetX(18); $pdf->Cell(0, 5, 'Name: ' . $inv->full_name, 0, 1);
    $pdf->SetX(18); $pdf->Cell(0, 5, 'CNIC: ' . ($inv->cnic ?: 'N/A'), 0, 1);
    $pdf->SetX(18); $pdf->Cell(0, 5, 'Phone: ' . $inv->phone, 0, 1);
    $pdf->SetX(18); $pdf->Cell(0, 5, 'Address: ' . substr($inv->permanent_address ?: 'N/A', 0, 40), 0, 1);

    // ── Property Info Box ─────────────────────────────────────────────────────
    $y_right = $pdf->GetY() - 37;
    $pdf->RoundedRect( 110, $y_right, 85, 42, 3, 'DF' );
    $pdf->SetXY( 113, $y_right + 3 );
    $pdf->SetFont( 'Arial', 'B', 9 ); $pdf->SetTextColor( ...$gray );
    $pdf->Cell( 0, 5, 'PROPERTY DETAILS', 0, 1 );
    $pdf->SetFont( 'Arial', '', 9 ); $pdf->SetTextColor( ...$dark );
    $pdf->SetX(113); $pdf->Cell(0, 5, 'Property: ' . $inv->property_name, 0, 1);
    $pdf->SetX(113); $pdf->Cell(0, 5, 'Unit: ' . $inv->unit_number . ' (Floor ' . $inv->floor . ')', 0, 1);
    $pdf->SetX(113); $pdf->Cell(0, 5, 'Type: ' . $inv->unit_type, 0, 1);
    $pdf->SetX(113); $pdf->Cell(0, 5, $inv->property_address, 0, 1);

    $pdf->SetY( $y_right + 47 );
    $pdf->Ln(3);

    // ── Charges Table ─────────────────────────────────────────────────────────
    $pdf->SetFillColor( ...$primary );
    $pdf->SetTextColor( 255, 255, 255 );
    $pdf->SetFont( 'Arial', 'B', 9 );
    $pdf->Cell( 120, 7, 'Charge Description', 1, 0, 'L', true );
    $pdf->Cell( 60, 7, 'Amount (PKR)', 1, 1, 'R', true );

    $rows = [
        ['Monthly Rent',                            $inv->rent_amount],
        ['Electricity (' . $inv->electricity_units . ' units @ ' . $inv->electricity_rate . '/unit)',
                                                    $inv->electricity_amount],
        ['Water Charges',                           $inv->water_charges],
        ['Maintenance Fee',                         $inv->maintenance_fee],
        ['Other Charges' . ($inv->other_desc ? " ({$inv->other_desc})" : ''), $inv->other_charges],
        ['Previous Arrears',                        $inv->arrears],
    ];

    $fill = false;
    $pdf->SetTextColor( ...$dark );
    foreach ( $rows as $row ) {
        if ( (float)$row[1] == 0 ) continue;
        $pdf->SetFillColor( $fill ? 241 : 255, $fill ? 245 : 255, $fill ? 249 : 255 );
        $pdf->SetFont( 'Arial', '', 9 );
        $pdf->Cell( 120, 6, $row[0], 1, 0, 'L', true );
        $pdf->Cell( 60, 6, 'PKR ' . number_format( (float)$row[1], 2 ), 1, 1, 'R', true );
        $fill = ! $fill;
    }

    // Total Row
    $pdf->SetFillColor( ...$dark );
    $pdf->SetTextColor( 255, 255, 255 );
    $pdf->SetFont( 'Arial', 'B', 10 );
    $pdf->Cell( 120, 8, 'TOTAL AMOUNT DUE', 1, 0, 'L', true );
    $pdf->Cell( 60, 8, 'PKR ' . number_format( (float)$inv->total_amount, 2 ), 1, 1, 'R', true );

    // Paid / Balance
    if ( (float)$inv->paid_amount > 0 ) {
        $pdf->SetFillColor( 16, 185, 129 );
        $pdf->Cell( 120, 7, 'Amount Paid', 1, 0, 'L', true );
        $pdf->Cell( 60, 7, 'PKR ' . number_format( (float)$inv->paid_amount, 2 ), 1, 1, 'R', true );
        $pdf->SetFillColor( (float)$inv->balance > 0 ? 239 : 16, (float)$inv->balance > 0 ? 68 : 185, (float)$inv->balance > 0 ? 68 : 129 );
        $pdf->Cell( 120, 7, 'Balance Remaining', 1, 0, 'L', true );
        $pdf->Cell( 60, 7, 'PKR ' . number_format( (float)$inv->balance, 2 ), 1, 1, 'R', true );
    }
    $pdf->Ln(5);

    // Status Badge
    $status_color = $inv->status === 'Paid' ? [16,185,129] : ($inv->status === 'Partial' ? [245,158,11] : [239,68,68]);
    $pdf->SetFillColor( ...$status_color );
    $pdf->SetTextColor( 255, 255, 255 );
    $pdf->SetFont( 'Arial', 'B', 11 );
    $pdf->Cell( 0, 8, 'STATUS: ' . strtoupper( $inv->status ), 0, 1, 'C', true );
    $pdf->Ln(3);

    // Payment History
    if ( $payments ) {
        $pdf->SetTextColor( ...$dark );
        $pdf->SetFont( 'Arial', 'B', 9 );
        $pdf->Cell( 0, 6, 'Payment History:', 0, 1 );
        $pdf->SetFont( 'Arial', '', 8 );
        foreach ( $payments as $p ) {
            $pdf->Cell( 0, 5,
                '• ' . $p->paid_date . ' — PKR ' . number_format( $p->amount, 0 ) .
                ' via ' . $p->payment_method . ' [' . $p->receipt_number . ']',
                0, 1
            );
        }
        $pdf->Ln(2);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    $pdf->SetY( -25 );
    $pdf->SetFillColor( ...$primary );
    $pdf->Rect( 0, $pdf->GetY(), 210, 25, 'F' );
    $pdf->SetTextColor( 255, 255, 255 );
    $pdf->SetFont( 'Arial', 'I', 8 );
    $pdf->Cell( 0, 8, MUNSHI_DEVELOPER, 0, 1, 'C' );
    $pdf->SetFont( 'Arial', '', 7 );
    $pdf->Cell( 0, 5, 'Generated on: ' . current_time( 'mysql' ) . ' | ' . home_url(), 0, 1, 'C' );

    // Output
    if ( $download ) {
        $pdf->Output( 'D', 'Invoice-' . $inv->invoice_number . '.pdf' );
    } else {
        $pdf->Output( 'I', 'Invoice-' . $inv->invoice_number . '.pdf' );
    }
}

/**
 * HTML fallback invoice when FPDF is not installed
 */
function munshi_generate_html_invoice( $inv, $payments, bool $download = true ): void {
    if ( $download ) {
        header( 'Content-Type: text/html; charset=UTF-8' );
    }
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice <?php echo esc_html( $inv->invoice_number ); ?></title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
            .header { background: #1d4ed8; color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .header h1 { margin: 0; font-size: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .box h3 { margin: 0 0 10px; color: #64748b; font-size: 11px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #1d4ed8; color: white; padding: 8px 12px; text-align: left; }
            td { padding: 7px 12px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
            .total-row td { background: #1e293b; color: white; font-weight: bold; }
            .footer { background: #1d4ed8; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 30px; }
            @media print { button { display: none; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1><?php echo esc_html( get_bloginfo('name') ?: 'Pak-Munshi Pro' ); ?></h1>
            <p style="margin:4px 0 0">RENT INVOICE — <?php echo esc_html( $inv->invoice_number ); ?></p>
        </div>
        <div class="grid">
            <div class="box">
                <h3>Tenant</h3>
                <p><strong><?php echo esc_html( $inv->full_name ); ?></strong><br>
                CNIC: <?php echo esc_html( $inv->cnic ?: 'N/A' ); ?><br>
                Phone: <?php echo esc_html( $inv->phone ); ?></p>
            </div>
            <div class="box">
                <h3>Property</h3>
                <p><strong><?php echo esc_html( $inv->property_name ); ?></strong><br>
                Unit: <?php echo esc_html( $inv->unit_number ); ?><br>
                Month: <?php echo esc_html( $inv->billing_month ); ?> | Due: <?php echo esc_html( $inv->due_date ); ?></p>
            </div>
        </div>
        <table>
            <tr><th>Charge</th><th>Amount (PKR)</th></tr>
            <tr><td>Monthly Rent</td><td><?php echo number_format( $inv->rent_amount, 2 ); ?></td></tr>
            <?php if ($inv->electricity_amount > 0): ?>
            <tr><td>Electricity (<?php echo $inv->electricity_units; ?> units)</td><td><?php echo number_format( $inv->electricity_amount, 2 ); ?></td></tr>
            <?php endif; ?>
            <?php if ($inv->water_charges > 0): ?>
            <tr><td>Water Charges</td><td><?php echo number_format( $inv->water_charges, 2 ); ?></td></tr>
            <?php endif; ?>
            <?php if ($inv->maintenance_fee > 0): ?>
            <tr><td>Maintenance Fee</td><td><?php echo number_format( $inv->maintenance_fee, 2 ); ?></td></tr>
            <?php endif; ?>
            <?php if ($inv->arrears > 0): ?>
            <tr><td>Previous Arrears</td><td><?php echo number_format( $inv->arrears, 2 ); ?></td></tr>
            <?php endif; ?>
            <tr class="total-row"><td>TOTAL DUE</td><td>PKR <?php echo number_format( $inv->total_amount, 2 ); ?></td></tr>
            <?php if ($inv->paid_amount > 0): ?>
            <tr style="background:#dcfce7"><td>Paid</td><td>PKR <?php echo number_format( $inv->paid_amount, 2 ); ?></td></tr>
            <tr style="background:#fee2e2"><td>Balance</td><td>PKR <?php echo number_format( $inv->balance, 2 ); ?></td></tr>
            <?php endif; ?>
        </table>
        <div class="footer">
            <?php echo esc_html( MUNSHI_DEVELOPER ); ?><br>
            <small>Generated: <?php echo current_time('mysql'); ?></small>
        </div>
        <script>window.onload = function(){ window.print(); }</script>
    </body>
    </html>
    <?php
}
