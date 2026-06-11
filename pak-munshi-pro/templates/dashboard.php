<?php
/**
 * Standalone Dashboard Template — Bypasses WordPress theme
 * Pak-Munshi Pro — Designed and Developed by Sami Khan - SQ Tech
 */
if ( ! defined( 'ABSPATH' ) ) exit;
wp_enqueue_style( 'munshi-style' );
wp_enqueue_script( 'munshi-app' );
?>
<!DOCTYPE html>
<html lang="en" <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pak-Munshi Pro — <?php bloginfo('name'); ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@500;600;700;800&display=swap" rel="stylesheet">
<?php wp_head(); ?>
</head>
<body>
<div id="munshi-app">

  <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
  <aside id="munshi-sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">
        <div class="logo-icon">⚖️</div>
        <div class="logo-text">
          <div class="logo-name">Pak-Munshi</div>
          <div class="logo-sub">Legal Suite v1.0</div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">Overview</div>
      <div class="nav-item active" data-section="dashboard">
        <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
      </div>

      <div class="nav-section">Litigation</div>
      <div class="nav-item" data-section="cases">
        <span class="nav-icon">📁</span><span class="nav-label">Court Cases</span>
      </div>
      <div class="nav-item" data-section="units"> <!-- mapped as units/hearings for compatibility -->
        <span class="nav-icon">📅</span><span class="nav-label">Hearings Diary</span>
      </div>
      <div class="nav-item" data-section="tenants"> <!-- mapped as tenants/clients for compatibility -->
        <span class="nav-icon">👤</span><span class="nav-label">Clients</span>
      </div>

      <div class="nav-section">Finance & Bills</div>
      <div class="nav-item" data-section="billing">
        <span class="nav-icon">🧾</span><span class="nav-label">Fee Invoices</span>
      </div>
      <div class="nav-item" data-section="payments">
        <span class="nav-icon">💰</span><span class="nav-label">Payments Ledger</span>
      </div>
      <div class="nav-item" data-section="reports">
        <span class="nav-icon">📈</span><span class="nav-label">Analytics Reports</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <?php echo esc_html( MUNSHI_DEVELOPER ); ?><br>
      <a href="<?php echo esc_url( admin_url() ); ?>" style="color:var(--color-primary);text-decoration:none">← WP Admin</a>
    </div>
  </aside>

  <!-- ── Main ────────────────────────────────────────────────────────────── -->
  <div id="munshi-main">

    <!-- Topbar -->
    <header id="munshi-topbar">
      <div class="topbar-title" id="topbar-title">Dashboard</div>
      <div class="topbar-right">
        <span style="font-size:12px;color:var(--text-muted)">👤 <?php echo esc_html( wp_get_current_user()->display_name ); ?></span>
        <a href="<?php echo esc_url( wp_logout_url( home_url() ) ); ?>" class="btn btn-glass btn-sm">🔒 Logout</a>
      </div>
    </header>

    <!-- Content -->
    <div id="munshi-content">

      <!-- ── DASHBOARD ────────────────────────────────────────────────────── -->
      <div id="section-dashboard" class="munshi-section active">
        <div class="kpi-grid">
          <div class="kpi-card" style="--kpi-color:rgba(59,130,246,0.15)">
            <div class="kpi-icon">📁</div>
            <div class="kpi-value" id="kpi-properties">—</div>
            <div class="kpi-label">Active Cases</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(16,185,129,0.15)">
            <div class="kpi-icon">📅</div>
            <div class="kpi-value" id="kpi-occupied">—</div>
            <div class="kpi-label">Pending Hearings</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(245,158,11,0.15)">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value" id="kpi-vacant">—</div>
            <div class="kpi-label">Active Clients</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(239,68,68,0.15)">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-value" id="kpi-dues" style="font-size:18px">—</div>
            <div class="kpi-label">Total Fee Dues</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(16,185,129,0.15)">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" id="kpi-revenue" style="font-size:18px">—</div>
            <div class="kpi-label">Collected This Month</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="glass-card">
            <div class="card-header"><span class="card-title">💳 Recent Fee Payments</span></div>
            <div class="table-wrapper">
              <table class="munshi-table"><thead><tr>
                <th>Receipt</th><th>Client</th><th>Amount</th><th>Date</th><th>Status</th>
              </tr></thead><tbody id="recent-payments-tbody"><tr><td colspan="5" style="text-align:center;padding:20px">Loading…</td></tr></tbody></table>
            </div>
          </div>
          <div class="glass-card">
            <div class="card-header"><span class="card-title">📅 Upcoming Hearings Diary</span></div>
            <div class="table-wrapper">
              <table class="munshi-table"><thead><tr>
                <th>Case Title</th><th>Hearing Date</th><th>Court</th><th>Purpose</th><th>Status</th>
              </tr></thead><tbody id="upcoming-dues-tbody"><tr><td colspan="5" style="text-align:center;padding:20px">Loading…</td></tr></tbody></table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── COURT CASES ─────────────────────────────────────────────────── -->
      <div id="section-cases" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">📁 Case Files Registry</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-cases" placeholder="Search cases…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-property">+ Add New Case</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-cases">
            <table class="munshi-table"><thead><tr>
              <th>Case Title & No.</th><th>Client</th><th>Case Type</th><th>Court</th><th>Judge</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="properties-tbody"><tr><td colspan="7" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── HEARINGS DIARY ──────────────────────────────────────────────── -->
      <div id="section-units" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">📅 Court Hearings Diary</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-hearings" placeholder="Search hearings…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-unit">+ Add Hearing</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-hearings">
            <table class="munshi-table"><thead><tr>
              <th>Case Title</th><th>Hearing Date / Time</th><th>Court Name</th><th>Purpose</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="units-tbody"><tr><td colspan="6" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── CLIENTS ─────────────────────────────────────────────────────── -->
      <div id="section-tenants" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">👤 Clients Directory</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-clients" placeholder="Search clients…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-tenant">+ Add Client</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-clients">
            <table class="munshi-table"><thead><tr>
              <th>Client Name / CNIC</th><th>Phone</th><th>WhatsApp</th><th>Email</th><th>Total Cases</th><th>Active Cases</th><th>Actions</th>
            </tr></thead><tbody id="tenants-tbody"><tr><td colspan="7" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── FEE INVOICES ────────────────────────────────────────────────── -->
      <div id="section-billing" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">🧾 Fee Invoices</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-invoices" placeholder="Search invoices…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-invoice">+ Generate Fee Invoice</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-invoices">
            <table class="munshi-table"><thead><tr>
              <th>Invoice #</th><th>Client</th><th>Case Title</th><th>Total Fee</th><th>Balance Dues</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="invoices-tbody"><tr><td colspan="7" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── PAYMENTS LEDGER ──────────────────────────────────────────────── -->
      <div id="section-payments" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">💰 Fee Collection Ledger</span>
            <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-payments" placeholder="Search payments…"></div>
          </div>
          <div class="table-wrapper" id="tbl-payments">
            <table class="munshi-table"><thead><tr>
              <th>Receipt #</th><th>Client</th><th>Invoice / Date</th><th>Amount Collected</th><th>Payment Method</th>
            </tr></thead><tbody id="payments-tbody"><tr><td colspan="5" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── ANALYTICS REPORTS ────────────────────────────────────────────── -->
      <div id="section-reports" class="munshi-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 style="font-size:18px;font-weight:800;color:var(--color-primary)">📈 Case & Revenue Reports</h2>
          <select id="report-year" class="btn btn-glass" style="padding:8px 14px;cursor:pointer"></select>
        </div>
        <div class="kpi-grid" style="margin-bottom:20px">
          <div class="kpi-card"><div class="kpi-icon">📁</div><div class="kpi-value" id="rpt-properties">—</div><div class="kpi-label">Active Cases</div></div>
          <div class="kpi-card"><div class="kpi-icon">✅</div><div class="kpi-value" id="rpt-occupied">—</div><div class="kpi-label">Closed Cases</div></div>
          <div class="kpi-card"><div class="kpi-icon">👤</div><div class="kpi-value" id="rpt-tenants">—</div><div class="kpi-label">Active Clients</div></div>
          <div class="kpi-card"><div class="kpi-icon">⚠️</div><div class="kpi-value" id="rpt-dues" style="font-size:16px">—</div><div class="kpi-label">Pending Dues</div></div>
          <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value" id="rpt-revenue" style="font-size:16px">—</div><div class="kpi-label">Yearly Revenue</div></div>
        </div>
        <div class="glass-card" style="margin-bottom:20px">
          <div class="card-header">
            <span class="card-title">Fee Billed vs Collected (Monthly)</span>
            <div style="display:flex;gap:12px;font-size:12px">
              <span><span style="display:inline-block;width:12px;height:12px;background:rgba(59,130,246,0.5);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Billed</span>
              <span><span style="display:inline-block;width:12px;height:12px;background:rgba(16,185,129,0.7);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Collected</span>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="munshi-revenue-chart" class="munshi-chart"></canvas>
          </div>
        </div>
        <div class="glass-card">
          <div class="card-header"><span class="card-title">📅 Upcoming Critical Hearings (Next 30 Days)</span></div>
          <div class="table-wrapper">
            <table class="munshi-table"><thead><tr>
              <th>Case Title</th><th>Hearing Date</th><th>Court</th><th>Purpose</th>
            </tr></thead><tbody id="expiring-tbody"></tbody></table>
          </div>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /app -->

<!-- ── Toast Container ──────────────────────────────────────────────────── -->
<div id="munshi-toast"></div>

<!-- ══════════════════════════════════════════════════════════════════════════
     MODALS
     (Mapped element attributes/IDs to match AJAX script and Javascript)
     ══════════════════════════════════════════════════════════════════════════ -->

<!-- Case Modal -->
<div id="modal-property" class="modal-overlay">
  <div class="modal-box" style="max-width:680px">
    <div class="modal-header">
      <span class="modal-title">📁 Case File</span>
      <button class="modal-close">✕</button>
    </div>
    <form id="form-property">
      <input type="hidden" id="prop-id" name="id">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full"><label>Client Name *</label><select id="prop-client" name="client_id" required><option value="">Select Client</option></select></div>
          <div class="form-group"><label>Case Title *</label><input id="prop-name" name="case_title" required placeholder="e.g. Ali vs State"></div>
          <div class="form-group"><label>Case Number *</label><input id="prop-address" name="case_number" required placeholder="e.g. CR-122/2026"></div>
          <div class="form-group"><label>Case Type</label>
            <select id="prop-type" name="case_type">
              <option>Civil</option><option>Criminal</option><option>Family</option><option>Corporate</option><option>Taxation</option>
            </select>
          </div>
          <div class="form-group"><label>Court Name *</label><input id="prop-floors" name="court_name" required placeholder="e.g. Islamabad High Court"></div>
          <div class="form-group"><label>Judge Name</label><input name="judge_name" placeholder="Presiding Judge"></div>
          <div class="form-group"><label>Opposite Party *</label><input name="opposite_party" required placeholder="e.g. State / Respondent"></div>
          <div class="form-group"><label>Opposite Counsel</label><input name="opposite_counsel" placeholder="Opposing Lawyer"></div>
          <div class="form-group"><label>FIR Number</label><input name="fir_number" placeholder="FIR No (if criminal)"></div>
          <div class="form-group"><label>Police Station</label><input name="police_station" placeholder="Police Station name"></div>
          <div class="form-group"><label>Case Priority</label>
            <select name="priority"><option>LOW</option><option selected>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
          </div>
          <div class="form-group"><label>Case Status</label>
            <select id="prop-status" name="status">
              <option value="ONGOING">Ongoing</option>
              <option value="DISPOSED">Disposed</option>
              <option value="APPEALED">Appealed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div class="form-group full"><label>Case Description</label><textarea name="description" rows="2" placeholder="Description of the case..."></textarea></div>
          <div class="form-group full"><label>Internal Notes</label><textarea name="internal_notes" rows="2" placeholder="Private lawyer notes..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Case</button>
      </div>
    </form>
  </div>
</div>

<!-- Hearing Modal -->
<div id="modal-unit" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">📅 Court Hearing</span><button class="modal-close">✕</button></div>
    <form id="unit-form">
      <input type="hidden" id="unit-id" name="id">
      <input type="hidden" name="action" value="munshi_save_hearing">
      <input type="hidden" name="nonce" value="<?php echo esc_attr( wp_create_nonce('munshi_nonce') ); ?>">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full"><label>Select Case File *</label><select id="unit-property" name="case_id" required><option>Loading cases…</option></select></div>
          <div class="form-group"><label>Hearing Date *</label><input type="date" name="hearing_date" required></div>
          <div class="form-group"><label>Hearing Time</label><input type="time" name="hearing_time"></div>
          <div class="form-group"><label>Court Name *</label><input name="court_name" required placeholder="e.g. Court Room No. 4"></div>
          <div class="form-group"><label>Purpose *</label><input name="purpose" required placeholder="e.g. Arguments / Evidence"></div>
          <div class="form-group"><label>Hearing Status</label>
            <select name="status"><option>SCHEDULED</option><option>HEARD</option><option>ADJOURNED</option><option>CANCELLED</option></select>
          </div>
          <div class="form-group"><label>Next Hearing Date</label><input type="date" name="next_hearing_date"></div>
          <div class="form-group full"><label>Order Summary / Notes</label><textarea name="order_summary" rows="2" placeholder="Summary of orders passed..."></textarea></div>
          <div class="form-group full"><label>General Remarks</label><textarea name="remarks" rows="2" placeholder="Hearing remarks..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Hearing</button>
      </div>
    </form>
  </div>
</div>

<!-- Client Onboarding Modal -->
<div id="modal-tenant" class="modal-overlay">
  <div class="modal-box" style="max-width:700px">
    <div class="modal-header"><span class="modal-title">👤 Client Onboarding</span><button class="modal-close">✕</button></div>
    <form id="tenant-form" enctype="multipart/form-data">
      <input type="hidden" id="tenant-id" name="id">
      <input type="hidden" name="action" value="munshi_save_client">
      <input type="hidden" name="nonce" value="<?php echo esc_attr( wp_create_nonce('munshi_nonce') ); ?>">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group"><label>Full Name *</label><input name="name" required placeholder="Muhammad Ali"></div>
          <div class="form-group"><label>Email Address</label><input name="email" type="email" placeholder="name@email.com"></div>
          <div class="form-group"><label>Phone Number *</label><input name="phone" required placeholder="0300-1234567"></div>
          <div class="form-group"><label>WhatsApp Number</label><input name="whatsapp" placeholder="0300-1234567"></div>
          <div class="form-group"><label>CNIC Number</label><input name="cnic" placeholder="37405-1234567-1"></div>
          <div class="form-group full"><label>Permanent Address</label><textarea name="address" rows="2" placeholder="Full residential/business address"></textarea></div>
          <div class="form-group full"><label>Notes</label><textarea name="notes" rows="2" placeholder="Client history, case context..."></textarea></div>
          <div class="form-group full"><label>Upload Case Document / CNIC copy</label><input type="file" name="file" accept="image/*,.pdf"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Client</button>
      </div>
    </form>
  </div>
</div>

<!-- Invoice Modal -->
<div id="modal-invoice" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">🧾 Generate Fee Invoice</span><button class="modal-close">✕</button></div>
    <form id="invoice-form">
      <input type="hidden" id="inv-tenant-id" name="tenant_id">
      <div class="modal-body">
        <div id="inv-tenant-name" style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--color-primary)"></div>
        <select id="inv-tenant-select" name="tenant_select" style="display:none;margin-bottom:16px;width:100%"><option value="">Select Client</option></select>
        
        <div class="form-grid">
          <div class="form-group full"><label>Select Case File (Optional)</label><select id="inv-case-select" name="case_id"><option value="">General Consultation (No Case)</option></select></div>
          <div class="form-group"><label>Agreed Fee (PKR) *</label><input id="inv-elec-units" name="amount" type="number" required placeholder="0"></div>
          <div class="form-group"><label>Discount / Adjustments (PKR)</label><input id="inv-elec-rate" name="discount" type="number" value="0"></div>
          <div class="form-group full"><label>Due Date *</label><input id="inv-other" name="due_date" type="date" required></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">⚡ Generate Invoice</button>
      </div>
    </form>
  </div>
</div>

<!-- Payment Modal -->
<div id="modal-payment" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">💰 Record Fee Payment</span><button class="modal-close">✕</button></div>
    <form id="payment-form">
      <input type="hidden" id="pay-invoice-id" name="invoice_id">
      <div class="modal-body">
        <p style="margin-bottom:16px">Invoice: <strong id="pay-invoice-num"></strong> | Dues Balance: <strong id="pay-balance" style="color:var(--color-danger)"></strong></p>
        <div class="form-grid">
          <div class="form-group"><label>Amount Paid (PKR) *</label><input id="pay-amount" name="amount" type="number" step="0.01" required placeholder="0"></div>
          <div class="form-group"><label>Payment Date *</label><input id="pay-date" name="paid_date" type="date" required></div>
          <div class="form-group"><label>Payment Method</label>
            <select id="pay-method" name="payment_method">
              <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>EasyPaisa</option><option>JazzCash</option>
            </select>
          </div>
          <div class="form-group"><label>Reference No.</label><input id="pay-ref" name="reference_no" placeholder="e.g. Transaction ID"></div>
          <div class="form-group full"><label>Bank Name</label><input id="pay-bank" name="bank_name" placeholder="e.g. HBL / Alfalah"></div>
          <div class="form-group full"><label>Notes</label><textarea id="pay-notes" name="notes" rows="2" placeholder="Any remarks…"></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-success">✅ Record Payment</button>
      </div>
    </form>
  </div>
</div>

<?php wp_footer(); ?>
</body>
</html>
