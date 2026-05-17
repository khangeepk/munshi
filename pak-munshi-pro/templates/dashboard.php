<?php
/**
 * Standalone Dashboard Template — bypasses active WordPress theme
 * Pak-Munshi Pro — Designed and Developed by Sikandar Hayat Baba
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<?php wp_head(); ?>
</head>
<body>
<div id="munshi-app">

  <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
  <aside id="munshi-sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">
        <div class="logo-icon">🏢</div>
        <div class="logo-text">
          <div class="logo-name">Pak-Munshi</div>
          <div class="logo-sub">Pro Suite v1.0</div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">Overview</div>
      <div class="nav-item active" data-section="dashboard">
        <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
      </div>

      <div class="nav-section">Portfolio</div>
      <div class="nav-item" data-section="properties">
        <span class="nav-icon">🏢</span><span class="nav-label">Properties</span>
      </div>
      <div class="nav-item" data-section="units">
        <span class="nav-icon">🚪</span><span class="nav-label">Units / Flats</span>
      </div>
      <div class="nav-item" data-section="tenants">
        <span class="nav-icon">👤</span><span class="nav-label">Tenants</span>
      </div>

      <div class="nav-section">Finance</div>
      <div class="nav-item" data-section="billing">
        <span class="nav-icon">🧾</span><span class="nav-label">Billing</span>
      </div>
      <div class="nav-item" data-section="payments">
        <span class="nav-icon">💰</span><span class="nav-label">Payments</span>
      </div>
      <div class="nav-item" data-section="reports">
        <span class="nav-icon">📈</span><span class="nav-label">Reports</span>
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
            <div class="kpi-icon">🏢</div>
            <div class="kpi-value" id="kpi-properties">—</div>
            <div class="kpi-label">Properties</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(16,185,129,0.15)">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value" id="kpi-occupied">—</div>
            <div class="kpi-label">Occupied Units</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(245,158,11,0.15)">
            <div class="kpi-icon">🚪</div>
            <div class="kpi-value" id="kpi-vacant">—</div>
            <div class="kpi-label">Vacant Units</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(139,92,246,0.15)">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value" id="kpi-tenants">—</div>
            <div class="kpi-label">Active Tenants</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(239,68,68,0.15)">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-value" id="kpi-dues" style="font-size:18px">—</div>
            <div class="kpi-label">Total Dues</div>
          </div>
          <div class="kpi-card" style="--kpi-color:rgba(16,185,129,0.15)">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" id="kpi-revenue" style="font-size:18px">—</div>
            <div class="kpi-label">This Month</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="glass-card">
            <div class="card-header"><span class="card-title">💳 Recent Payments</span></div>
            <div class="table-wrapper">
              <table class="munshi-table"><thead><tr>
                <th>Receipt</th><th>Tenant</th><th>Amount</th><th>Date</th><th>Status</th>
              </tr></thead><tbody id="recent-payments-tbody"><tr><td colspan="5" style="text-align:center;padding:20px">Loading…</td></tr></tbody></table>
            </div>
          </div>
          <div class="glass-card">
            <div class="card-header"><span class="card-title">🔴 Upcoming Dues</span></div>
            <div class="table-wrapper">
              <table class="munshi-table"><thead><tr>
                <th>Tenant</th><th>Unit</th><th>Balance</th><th>Due Date</th><th>Status</th>
              </tr></thead><tbody id="upcoming-dues-tbody"><tr><td colspan="5" style="text-align:center;padding:20px">Loading…</td></tr></tbody></table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── PROPERTIES ───────────────────────────────────────────────────── -->
      <div id="section-properties" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">🏢 Properties</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-properties" placeholder="Search…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-property">+ Add Property</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-properties">
            <table class="munshi-table"><thead><tr>
              <th>Name</th><th>Address</th><th>Type</th><th>Units</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="properties-tbody"><tr><td colspan="6" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── UNITS ────────────────────────────────────────────────────────── -->
      <div id="section-units" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">🚪 Units / Flats / Shops</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-units" placeholder="Search…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-unit">+ Add Unit</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-units">
            <table class="munshi-table"><thead><tr>
              <th>Property</th><th>Unit No.</th><th>Floor</th><th>Type</th><th>Rent</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="units-tbody"><tr><td colspan="7" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── TENANTS ──────────────────────────────────────────────────────── -->
      <div id="section-tenants" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">👤 Tenants</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-tenants" placeholder="Search…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-tenant">+ Add Tenant</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-tenants">
            <table class="munshi-table"><thead><tr>
              <th>Name / CNIC</th><th>Property / Unit</th><th>Phone</th><th>Rent</th><th>Agreement End</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="tenants-tbody"><tr><td colspan="7" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── BILLING ──────────────────────────────────────────────────────── -->
      <div id="section-billing" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">🧾 Invoices</span>
            <div style="display:flex;gap:10px;align-items:center">
              <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-invoices" placeholder="Search…"></div>
              <button class="btn btn-primary btn-sm" id="btn-add-invoice">+ Generate Invoice</button>
            </div>
          </div>
          <div class="table-wrapper" id="tbl-invoices">
            <table class="munshi-table"><thead><tr>
              <th>Invoice #</th><th>Tenant</th><th>Property / Unit</th><th>Month</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="invoices-tbody"><tr><td colspan="8" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── PAYMENTS ─────────────────────────────────────────────────────── -->
      <div id="section-payments" class="munshi-section">
        <div class="glass-card">
          <div class="card-header">
            <span class="card-title">💰 Payment Ledger</span>
            <div class="search-bar"><span class="search-icon">🔍</span><input type="text" class="live-search" data-target="#tbl-payments" placeholder="Search…"></div>
          </div>
          <div class="table-wrapper" id="tbl-payments">
            <table class="munshi-table"><thead><tr>
              <th>Receipt #</th><th>Tenant</th><th>Invoice / Month</th><th>Amount</th><th>Date</th><th>Method</th>
            </tr></thead><tbody id="payments-tbody"><tr><td colspan="6" style="text-align:center;padding:30px">Loading…</td></tr></tbody></table>
          </div>
        </div>
      </div>

      <!-- ── REPORTS ──────────────────────────────────────────────────────── -->
      <div id="section-reports" class="munshi-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 style="font-size:18px;font-weight:800">📈 Financial Reports</h2>
          <select id="report-year" class="btn btn-glass" style="padding:8px 14px;cursor:pointer"></select>
        </div>
        <div class="kpi-grid" style="margin-bottom:20px">
          <div class="kpi-card"><div class="kpi-icon">🏢</div><div class="kpi-value" id="rpt-properties">—</div><div class="kpi-label">Properties</div></div>
          <div class="kpi-card"><div class="kpi-icon">✅</div><div class="kpi-value" id="rpt-occupied">—</div><div class="kpi-label">Occupied/Total</div></div>
          <div class="kpi-card"><div class="kpi-icon">👤</div><div class="kpi-value" id="rpt-tenants">—</div><div class="kpi-label">Active Tenants</div></div>
          <div class="kpi-card"><div class="kpi-icon">⚠️</div><div class="kpi-value" id="rpt-dues" style="font-size:16px">—</div><div class="kpi-label">Pending Dues</div></div>
          <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value" id="rpt-revenue" style="font-size:16px">—</div><div class="kpi-label">Yearly Revenue</div></div>
        </div>
        <div class="glass-card" style="margin-bottom:20px">
          <div class="card-header">
            <span class="card-title">Revenue vs Billed (Monthly)</span>
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
          <div class="card-header"><span class="card-title">⚠️ Expiring Agreements (Next 30 Days)</span></div>
          <div class="table-wrapper">
            <table class="munshi-table"><thead><tr>
              <th>Tenant</th><th>Property / Unit</th><th>Expiry Date</th><th>Status</th>
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
══════════════════════════════════════════════════════════════════════════ -->

<!-- Property Modal -->
<div id="modal-property" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">🏢 Property</span>
      <button class="modal-close">✕</button>
    </div>
    <form id="form-property">
      <input type="hidden" id="prop-id" name="id">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full"><label>Property Name *</label><input id="prop-name" name="name" required placeholder="e.g. Al-Rehman Tower"></div>
          <div class="form-group full"><label>Full Address *</label><input id="prop-address" name="address" required placeholder="Street, City"></div>
          <div class="form-group"><label>Type</label>
            <select id="prop-type" name="type">
              <option>Residential</option><option>Commercial</option><option>Mixed</option>
            </select>
          </div>
          <div class="form-group"><label>Total Floors</label><input id="prop-floors" name="total_floors" type="number" min="1" value="1"></div>
          <div class="form-group"><label>Status</label>
            <select id="prop-status" name="status"><option>Active</option><option>Inactive</option></select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Property</button>
      </div>
    </form>
  </div>
</div>

<!-- Unit Modal -->
<div id="modal-unit" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">🚪 Unit / Flat</span><button class="modal-close">✕</button></div>
    <form id="unit-form">
      <input type="hidden" id="unit-id" name="id">
      <input type="hidden" name="action" value="munshi_save_unit">
      <input type="hidden" name="nonce" value="<?php echo esc_attr( wp_create_nonce('munshi_nonce') ); ?>">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full"><label>Property *</label><select id="unit-property" name="property_id" required><option>Loading…</option></select></div>
          <div class="form-group"><label>Unit Number *</label><input name="unit_number" required placeholder="e.g. A-101"></div>
          <div class="form-group"><label>Floor</label><input name="floor" type="number" value="0" min="0"></div>
          <div class="form-group"><label>Unit Type</label>
            <select name="unit_type"><option>Flat</option><option>Shop</option><option>Office</option><option>Warehouse</option></select>
          </div>
          <div class="form-group"><label>Area (sq.ft)</label><input name="area_sqft" type="number" placeholder="0"></div>
          <div class="form-group"><label>Monthly Rent (PKR) *</label><input name="rent_amount" type="number" required placeholder="0"></div>
          <div class="form-group"><label>Maintenance Fee</label><input name="maintenance_fee" type="number" value="0"></div>
          <div class="form-group"><label>Water Charges</label><input name="water_charges" type="number" value="500"></div>
          <div class="form-group"><label>Status</label>
            <select name="status"><option>Vacant</option><option>Occupied</option><option>Under Maintenance</option></select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Unit</button>
      </div>
    </form>
  </div>
</div>

<!-- Tenant Modal -->
<div id="modal-tenant" class="modal-overlay">
  <div class="modal-box" style="max-width:720px">
    <div class="modal-header"><span class="modal-title">👤 Tenant Onboarding</span><button class="modal-close">✕</button></div>
    <form id="tenant-form" enctype="multipart/form-data">
      <input type="hidden" id="tenant-id" name="id">
      <input type="hidden" name="action" value="munshi_save_tenant">
      <input type="hidden" name="nonce" value="<?php echo esc_attr( wp_create_nonce('munshi_nonce') ); ?>">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full"><label>Assign Unit *</label><select id="tenant-unit" name="unit_id" required><option>Loading…</option></select></div>
          <div class="form-group"><label>Full Name *</label><input name="full_name" required placeholder="Muhammad Ali"></div>
          <div class="form-group"><label>Father's Name</label><input name="father_name" placeholder="Abdul Rahman"></div>
          <div class="form-group"><label>CNIC</label><input name="cnic" placeholder="12345-1234567-1"></div>
          <div class="form-group"><label>Phone *</label><input name="phone" required placeholder="0300-0000000"></div>
          <div class="form-group"><label>WhatsApp</label><input name="whatsapp" placeholder="0300-0000000"></div>
          <div class="form-group"><label>Email</label><input name="email" type="email" placeholder="name@email.com"></div>
          <div class="form-group"><label>Occupation</label><input name="occupation" placeholder="Job/Business"></div>
          <div class="form-group"><label>Family Members</label><input name="family_members" type="number" value="1" min="1"></div>
          <div class="form-group"><label>Security Deposit (PKR)</label><input name="security_deposit" type="number" value="0"></div>
          <div class="form-group"><label>Agreement Start *</label><input name="agreement_start" type="date" required></div>
          <div class="form-group"><label>Agreement End</label><input name="agreement_end" type="date"></div>
          <div class="form-group"><label>Advance Months</label><input name="advance_months" type="number" value="0" min="0"></div>
          <div class="form-group"><label>Status</label>
            <select name="status"><option>Active</option><option>Inactive</option><option>Vacated</option></select>
          </div>
          <div class="form-group full"><label>Permanent Address</label><textarea name="permanent_address" rows="2" placeholder="Full permanent address"></textarea></div>
          <div class="form-group full"><label>Notes</label><textarea name="notes" rows="2" placeholder="Any additional notes…"></textarea></div>
          <div class="form-group full"><label>Upload CNIC / Document</label><input type="file" name="file" accept="image/*,.pdf"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">💾 Save Tenant</button>
      </div>
    </form>
  </div>
</div>

<!-- Invoice Modal -->
<div id="modal-invoice" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">🧾 Generate Invoice</span><button class="modal-close">✕</button></div>
    <form id="invoice-form">
      <input type="hidden" id="inv-tenant-id" name="tenant_id">
      <div class="modal-body">
        <div id="inv-tenant-name" style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--color-primary)"></div>
        <select id="inv-tenant-select" name="tenant_select" style="display:none;margin-bottom:16px;width:100%"><option value="">Select Tenant</option></select>
        <div class="form-grid">
          <div class="form-group full"><label>Billing Month *</label><input id="inv-month" name="billing_month" type="month" required></div>
          <div class="form-group"><label>Electricity Units</label><input id="inv-elec-units" name="electricity_units" type="number" step="0.01" value="0" placeholder="0"></div>
          <div class="form-group"><label>Per Unit Rate (PKR)</label><input id="inv-elec-rate" name="electricity_rate" type="number" step="0.01" value="25" placeholder="25"></div>
          <div class="form-group"><label>Other Charges (PKR)</label><input id="inv-other" name="other_charges" type="number" value="0"></div>
          <div class="form-group"><label>Other Description</label><input id="inv-other-desc" name="other_desc" placeholder="e.g. Repair work"></div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:12px">ℹ️ Rent, water & maintenance charges are auto-loaded from the unit settings. Arrears are calculated automatically.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-glass modal-close">Cancel</button>
        <button type="submit" class="btn btn-primary">⚡ Generate</button>
      </div>
    </form>
  </div>
</div>

<!-- Payment Modal -->
<div id="modal-payment" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header"><span class="modal-title">💰 Record Payment</span><button class="modal-close">✕</button></div>
    <form id="payment-form">
      <input type="hidden" id="pay-invoice-id" name="invoice_id">
      <div class="modal-body">
        <p style="margin-bottom:16px">Invoice: <strong id="pay-invoice-num"></strong> | Balance: <strong id="pay-balance" style="color:var(--color-danger)"></strong></p>
        <div class="form-grid">
          <div class="form-group"><label>Amount Paid (PKR) *</label><input id="pay-amount" name="amount" type="number" step="0.01" required placeholder="0"></div>
          <div class="form-group"><label>Payment Date *</label><input id="pay-date" name="paid_date" type="date" required></div>
          <div class="form-group"><label>Payment Method</label>
            <select id="pay-method" name="payment_method">
              <option>Cash</option><option>Bank Transfer</option><option>JazzCash</option><option>EasyPaisa</option><option>Cheque</option>
            </select>
          </div>
          <div class="form-group"><label>Reference No.</label><input id="pay-ref" name="reference_no" placeholder="Optional"></div>
          <div class="form-group full"><label>Bank Name</label><input id="pay-bank" name="bank_name" placeholder="If bank transfer"></div>
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
