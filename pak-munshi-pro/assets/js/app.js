/**
 * Pak-Munshi Pro — Frontend App Logic
 * Designed and Developed by Sikandar Hayat Baba
 */
(function ($) {
    'use strict';

    const AJAX = munshiAjax.ajaxUrl;
    const NONCE = munshiAjax.nonce;

    // ── Toast ─────────────────────────────────────────────────────────────────
    function toast(msg, type = 'info') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const $t = $(`<div class="toast-item ${type}"><span class="toast-dot">${icons[type]||'ℹ️'}</span><span>${msg}</span></div>`);
        $('#munshi-toast').append($t);
        setTimeout(() => $t.fadeOut(400, () => $t.remove()), 3500);
    }

    // ── AJAX Helper ───────────────────────────────────────────────────────────
    function ajax(action, data = {}, cb) {
        $.post(AJAX, { action: 'munshi_' + action, nonce: NONCE, ...data })
            .done(res => { if (res.success) cb(null, res.data); else cb(res.data || 'Error'); })
            .fail(() => cb('Network error'));
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    $(document).on('click', '.nav-item', function () {
        const section = $(this).data('section');
        if (!section) return;
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        $('.munshi-section').removeClass('active');
        $('#section-' + section).addClass('active');
        $('#topbar-title').text($(this).find('.nav-label').text());
        loadSection(section);
    });

    function loadSection(name) {
        const loaders = {
            dashboard: loadDashboard,
            properties: loadProperties,
            units: loadUnits,
            tenants: loadTenants,
            billing: loadInvoices,
            payments: loadPayments,
            reports: loadReports,
        };
        if (loaders[name]) loaders[name]();
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────
    function loadDashboard() {
        ajax('dashboard_init', {}, (err, data) => {
            if (err) return toast(err, 'error');
            const k = data.kpi;
            $('#kpi-properties').text(k.properties || 0);
            $('#kpi-occupied').text(k.occupied || 0);
            $('#kpi-vacant').text(k.vacant || 0);
            $('#kpi-tenants').text(k.tenants || 0);
            $('#kpi-dues').text('Rs. ' + fmtNum(k.total_dues || 0));
            $('#kpi-revenue').text('Rs. ' + fmtNum(k.this_month_revenue || 0));

            // Recent payments table
            let html = '';
            (data.recent_payments || []).forEach(p => {
                html += `<tr>
                    <td>${p.receipt_number}</td>
                    <td>${p.full_name}</td>
                    <td>Rs. ${fmtNum(p.amount)}</td>
                    <td>${p.paid_date}</td>
                    <td><span class="badge badge-green">Received</span></td>
                </tr>`;
            });
            $('#recent-payments-tbody').html(html || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">No recent payments</td></tr>');

            // Upcoming dues
            let dues = '';
            (data.upcoming_dues || []).forEach(i => {
                dues += `<tr>
                    <td>${i.full_name}</td>
                    <td>${i.property_name} / ${i.unit_number}</td>
                    <td>Rs. ${fmtNum(i.balance)}</td>
                    <td>${i.due_date}</td>
                    <td><span class="badge badge-red">${i.status}</span></td>
                </tr>`;
            });
            $('#upcoming-dues-tbody').html(dues || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">No pending dues</td></tr>');
        });
    }

    // ── Properties ────────────────────────────────────────────────────────────
    function loadProperties() {
        ajax('get_properties', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#properties-tbody').html(emptyRow(6)); return; }
            data.forEach(p => {
                const statusBadge = p.status === 'Active' ? 'badge-green' : 'badge-gray';
                html += `<tr>
                    <td><strong>${esc(p.name)}</strong></td>
                    <td class="muted">${esc(p.address)}</td>
                    <td>${esc(p.type)}</td>
                    <td>${p.total_units || 0}</td>
                    <td><span class="badge ${statusBadge}">${p.status}</span></td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-property" data-id="${p.id}">✏️ Edit</button>
                        <button class="btn btn-danger btn-xs del-property" data-id="${p.id}" data-name="${esc(p.name)}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#properties-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-property', () => openPropertyModal());
    $(document).on('click', '.edit-property', function () {
        const id = $(this).data('id');
        const row = $(this).closest('tr');
        openPropertyModal({
            id, name: row.find('td:eq(0)').text().trim(),
            address: row.find('td:eq(1)').text().trim(),
            type: row.find('td:eq(2)').text().trim(),
        });
    });
    $(document).on('click', '.del-property', function () {
        const id = $(this).data('id'), name = $(this).data('name');
        if (!confirm(`Delete property "${name}"? This cannot be undone.`)) return;
        ajax('delete_property', { id }, (err) => {
            if (err) return toast(err, 'error');
            toast('Property deleted.', 'success'); loadProperties();
        });
    });

    function openPropertyModal(data = {}) {
        $('#prop-id').val(data.id || '');
        $('#prop-name').val(data.name || '');
        $('#prop-address').val(data.address || '');
        $('#prop-type').val(data.type || 'Residential');
        $('#modal-property').addClass('open');
    }

    $(document).on('submit', '#form-property', function (e) {
        e.preventDefault();
        const payload = { id: $('#prop-id').val(), name: $('#prop-name').val(), address: $('#prop-address').val(), type: $('#prop-type').val(), total_floors: $('#prop-floors').val(), status: $('#prop-status').val() };
        ajax('save_property', payload, (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message, 'success');
            closeModal('#modal-property');
            loadProperties();
        });
    });

    // ── Units ─────────────────────────────────────────────────────────────────
    function loadUnits() {
        ajax('get_units', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#units-tbody').html(emptyRow(7)); return; }
            data.forEach(u => {
                const badge = u.status === 'Occupied' ? 'badge-green' : u.status === 'Vacant' ? 'badge-yellow' : 'badge-red';
                html += `<tr>
                    <td>${esc(u.property_name)}</td>
                    <td><strong>${esc(u.unit_number)}</strong></td>
                    <td>Floor ${u.floor}</td>
                    <td>${esc(u.unit_type)}</td>
                    <td>Rs. ${fmtNum(u.rent_amount)}</td>
                    <td><span class="badge ${badge}">${u.status}</span>${u.tenant_name ? '<br><small class="muted">'+esc(u.tenant_name)+'</small>':''}</td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-unit" data-id="${u.id}">✏️</button>
                        <button class="btn btn-danger btn-xs del-unit" data-id="${u.id}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#units-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-unit', () => openUnitModal());
    $(document).on('click', '.edit-unit', function () { openUnitModal({ id: $(this).data('id') }); });
    $(document).on('click', '.del-unit', function () {
        if (!confirm('Delete this unit?')) return;
        ajax('delete_unit', { id: $(this).data('id') }, (err) => {
            if (err) return toast(err, 'error');
            toast('Unit deleted.', 'success'); loadUnits();
        });
    });

    function openUnitModal(data = {}) {
        $('#unit-form')[0].reset();
        $('#unit-id').val(data.id || '');
        // Populate property dropdown
        ajax('get_properties', {}, (err, props) => {
            if (err) return;
            let opts = props.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
            $('#unit-property').html('<option value="">Select Property</option>' + opts);
        });
        $('#modal-unit').addClass('open');
    }

    $(document).on('submit', '#unit-form', function (e) {
        e.preventDefault();
        ajax('save_unit', $(this).serialize() + '&nonce=' + NONCE, (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message, 'success'); closeModal('#modal-unit'); loadUnits();
        });
    });

    // ── Tenants ───────────────────────────────────────────────────────────────
    function loadTenants() {
        ajax('get_tenants', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#tenants-tbody').html(emptyRow(7)); return; }
            data.forEach(t => {
                const statusBadge = t.status === 'Active' ? 'badge-green' : 'badge-gray';
                const expiryAlert = t.expiry_alert ? '<br><span class="badge badge-yellow">⚠️ Expiring Soon</span>' : '';
                html += `<tr>
                    <td><strong>${esc(t.full_name)}</strong><br><small class="muted">${esc(t.cnic||'')}</small></td>
                    <td>${esc(t.property_name)} / <strong>${esc(t.unit_number)}</strong></td>
                    <td>${esc(t.phone)}</td>
                    <td>Rs. ${fmtNum(t.rent_amount)}</td>
                    <td>${t.agreement_end||'Open'}${expiryAlert}</td>
                    <td><span class="badge ${statusBadge}">${t.status}</span></td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-tenant" data-id="${t.id}">✏️</button>
                        <button class="btn btn-primary btn-xs gen-invoice" data-id="${t.id}" data-name="${esc(t.full_name)}">🧾</button>
                        <button class="btn btn-danger btn-xs del-tenant" data-id="${t.id}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#tenants-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-tenant', () => openTenantModal());
    $(document).on('click', '.edit-tenant', function () { openTenantModal({ id: $(this).data('id') }); });
    $(document).on('click', '.del-tenant', function () {
        if (!confirm('Remove this tenant? Unit will be marked Vacant.')) return;
        ajax('delete_tenant', { id: $(this).data('id') }, (err) => {
            if (err) return toast(err, 'error');
            toast('Tenant removed.', 'success'); loadTenants();
        });
    });

    function openTenantModal(data = {}) {
        $('#tenant-form')[0].reset();
        $('#tenant-id').val(data.id || '');
        ajax('get_units', {}, (err, units) => {
            if (err) return;
            let opts = units.filter(u => u.status === 'Vacant' || (data.id && u.status === 'Occupied'))
                .map(u => `<option value="${u.id}">${esc(u.property_name)} — Unit ${esc(u.unit_number)} (${u.status})</option>`).join('');
            $('#tenant-unit').html('<option value="">Select Unit</option>' + opts);
        });
        $('#modal-tenant').addClass('open');
    }

    $(document).on('submit', '#tenant-form', function (e) {
        e.preventDefault();
        const fd = new FormData(this);
        fd.append('action', 'munshi_save_tenant');
        fd.append('nonce', NONCE);
        $.ajax({ url: AJAX, type: 'POST', data: fd, processData: false, contentType: false })
            .done(res => {
                if (res.success) { toast(res.data.message, 'success'); closeModal('#modal-tenant'); loadTenants(); }
                else toast(res.data, 'error');
            }).fail(() => toast('Network error', 'error'));
    });

    // ── Invoice Generation ────────────────────────────────────────────────────
    $(document).on('click', '.gen-invoice', function () {
        $('#inv-tenant-id').val($(this).data('id'));
        $('#inv-tenant-name').text($(this).data('name'));
        $('#inv-month').val(new Date().toISOString().slice(0, 7));
        $('#modal-invoice').addClass('open');
    });

    $(document).on('click', '#btn-add-invoice', () => {
        ajax('get_tenants', {}, (err, tenants) => {
            if (err) return;
            let opts = tenants.filter(t => t.status === 'Active')
                .map(t => `<option value="${t.id}">${esc(t.full_name)} — ${esc(t.unit_number)}</option>`).join('');
            $('#inv-tenant-select').html('<option value="">Select Tenant</option>' + opts).show();
            $('#inv-tenant-id').val('');
            $('#inv-tenant-name').text('');
            $('#modal-invoice').addClass('open');
        });
    });

    $(document).on('submit', '#invoice-form', function (e) {
        e.preventDefault();
        const tenantId = $('#inv-tenant-id').val() || $('#inv-tenant-select').val();
        ajax('generate_invoice', {
            tenant_id: tenantId,
            billing_month: $('#inv-month').val(),
            electricity_units: $('#inv-elec-units').val(),
            electricity_rate: $('#inv-elec-rate').val() || 25,
            other_charges: $('#inv-other').val() || 0,
            other_desc: $('#inv-other-desc').val(),
        }, (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message + ' | Total: Rs. ' + fmtNum(res.total), 'success');
            closeModal('#modal-invoice');
            loadInvoices();
        });
    });

    function loadInvoices() {
        ajax('get_invoices', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#invoices-tbody').html(emptyRow(8)); return; }
            data.forEach(i => {
                const badge = i.status === 'Paid' ? 'badge-green' : i.status === 'Partial' ? 'badge-yellow' : 'badge-red';
                html += `<tr>
                    <td><strong>${esc(i.invoice_number)}</strong></td>
                    <td>${esc(i.full_name)}</td>
                    <td>${esc(i.property_name)} / ${esc(i.unit_number)}</td>
                    <td>${esc(i.billing_month)}</td>
                    <td>Rs. ${fmtNum(i.total_amount)}</td>
                    <td class="${i.balance > 0 ? 'status-maintenance' : ''}">Rs. ${fmtNum(i.balance)}</td>
                    <td><span class="badge ${badge}">${i.status}</span></td>
                    <td class="actions">
                        <button class="btn btn-success btn-xs record-payment" data-id="${i.id}" data-num="${esc(i.invoice_number)}" data-balance="${i.balance}">💰 Pay</button>
                        <button class="btn btn-glass btn-xs download-invoice" data-id="${i.id}">📄 PDF</button>
                        <button class="btn btn-warning btn-xs send-reminder" data-id="${i.id}">📱 WA</button>
                    </td>
                </tr>`;
            });
            $('#invoices-tbody').html(html);
        });
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    $(document).on('click', '.record-payment', function () {
        $('#pay-invoice-id').val($(this).data('id'));
        $('#pay-invoice-num').text($(this).data('num'));
        $('#pay-balance').text('Rs. ' + fmtNum($(this).data('balance')));
        $('#pay-amount').val('');
        $('#pay-date').val(new Date().toISOString().slice(0, 10));
        $('#modal-payment').addClass('open');
    });

    $(document).on('submit', '#payment-form', function (e) {
        e.preventDefault();
        ajax('record_payment', {
            invoice_id: $('#pay-invoice-id').val(),
            amount: $('#pay-amount').val(),
            paid_date: $('#pay-date').val(),
            payment_method: $('#pay-method').val(),
            reference_no: $('#pay-ref').val(),
            bank_name: $('#pay-bank').val(),
            notes: $('#pay-notes').val(),
        }, (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message, 'success');
            closeModal('#modal-payment');
            loadInvoices();
        });
    });

    function loadPayments() {
        ajax('get_payments', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#payments-tbody').html(emptyRow(6)); return; }
            data.forEach(p => {
                html += `<tr>
                    <td>${esc(p.receipt_number)}</td>
                    <td>${esc(p.full_name)}</td>
                    <td>${esc(p.invoice_number)} (${esc(p.billing_month)})</td>
                    <td><strong>Rs. ${fmtNum(p.amount)}</strong></td>
                    <td>${p.paid_date}</td>
                    <td><span class="badge badge-blue">${esc(p.payment_method)}</span></td>
                </tr>`;
            });
            $('#payments-tbody').html(html);
        });
    }

    // ── PDF Download ──────────────────────────────────────────────────────────
    $(document).on('click', '.download-invoice', function () {
        const id = $(this).data('id');
        const form = $('<form method="POST" target="_blank" style="display:none"></form>').attr('action', AJAX);
        form.append(`<input name="action" value="munshi_download_invoice">`);
        form.append(`<input name="nonce" value="${NONCE}">`);
        form.append(`<input name="invoice_id" value="${id}">`);
        $('body').append(form);
        form.submit();
        setTimeout(() => form.remove(), 1000);
    });

    // ── WA Reminder ───────────────────────────────────────────────────────────
    $(document).on('click', '.send-reminder', function () {
        const id = $(this).data('id');
        ajax('send_wa_reminder', { invoice_id: id }, (err, res) => {
            if (err) return toast(err, 'error');
            if (res.wa_link) {
                toast('Opening WhatsApp...', 'info');
                window.open(res.wa_link, '_blank');
            } else {
                toast('Reminder sent via WhatsApp API!', 'success');
            }
        });
    });

    // ── Reports ───────────────────────────────────────────────────────────────
    function loadReports() {
        const year = $('#report-year').val() || new Date().getFullYear();
        ajax('get_analytics', { year }, (err, data) => {
            if (err) return toast(err, 'error');
            const k = data.kpi;
            $('#rpt-properties').text(k.total_properties);
            $('#rpt-occupied').text(k.occupied + ' / ' + k.total_units);
            $('#rpt-tenants').text(k.active_tenants);
            $('#rpt-dues').text('Rs. ' + fmtNum(k.total_dues));
            $('#rpt-revenue').text('Rs. ' + fmtNum(k.yearly_revenue));
            drawChart(data.revenue, data.billed);

            let expHtml = '';
            (data.expiring || []).forEach(t => {
                expHtml += `<tr>
                    <td>${esc(t.full_name)}</td>
                    <td>${esc(t.property_name)} / ${esc(t.unit_number)}</td>
                    <td>${t.agreement_end}</td>
                    <td><span class="badge badge-yellow">Expiring</span></td>
                </tr>`;
            });
            $('#expiring-tbody').html(expHtml || '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">No expiring agreements</td></tr>');
        });
    }

    function drawChart(revenue, billed) {
        const canvas = document.getElementById('munshi-revenue-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const collected = new Array(12).fill(0);
        const billedArr  = new Array(12).fill(0);

        (revenue || []).forEach(r => {
            const m = parseInt(r.month.split('-')[1]) - 1;
            collected[m] = parseFloat(r.collected);
        });
        (billed || []).forEach(b => {
            const m = parseInt(b.month.split('-')[1]) - 1;
            billedArr[m] = parseFloat(b.billed);
        });

        canvas.width  = canvas.parentElement.clientWidth;
        canvas.height = 220;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pad = { top: 20, right: 20, bottom: 40, left: 70 };
        const W = canvas.width - pad.left - pad.right;
        const H = canvas.height - pad.top - pad.bottom;
        const max = Math.max(...collected, ...billedArr, 1);
        const barW = W / months.length;

        // Grid lines
        ctx.strokeStyle = 'rgba(99,179,237,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (H / 4) * i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + W, y); ctx.stroke();
            ctx.fillStyle = '#475569'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
            ctx.fillText('Rs.' + fmtNum(max - (max / 4) * i), pad.left - 8, y + 4);
        }

        // Bars — Billed
        months.forEach((m, i) => {
            const x = pad.left + i * barW + barW * 0.1;
            const bH = (billedArr[i] / max) * H;
            ctx.fillStyle = 'rgba(59,130,246,0.25)';
            ctx.beginPath();
            ctx.roundRect(x, pad.top + H - bH, barW * 0.38, bH, 4);
            ctx.fill();
        });

        // Bars — Collected
        months.forEach((m, i) => {
            const x = pad.left + i * barW + barW * 0.52;
            const bH = (collected[i] / max) * H;
            ctx.fillStyle = 'rgba(16,185,129,0.7)';
            ctx.beginPath();
            ctx.roundRect(x, pad.top + H - bH, barW * 0.38, bH, 4);
            ctx.fill();
        });

        // X labels
        ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.font = '11px Inter,sans-serif';
        months.forEach((m, i) => {
            ctx.fillText(m, pad.left + i * barW + barW / 2, canvas.height - 10);
        });
    }

    $(document).on('change', '#report-year', loadReports);

    // ── Search ────────────────────────────────────────────────────────────────
    $(document).on('input', '.live-search', function () {
        const q = $(this).val().toLowerCase();
        const target = $(this).data('target');
        $(target + ' tbody tr').each(function () {
            $(this).toggle($(this).text().toLowerCase().includes(q));
        });
    });

    // ── Modals ────────────────────────────────────────────────────────────────
    $(document).on('click', '.modal-close, .modal-overlay', function (e) {
        if ($(e.target).hasClass('modal-overlay') || $(e.target).hasClass('modal-close')) {
            closeModal('.modal-overlay.open');
        }
    });

    function closeModal(sel) { $(sel).removeClass('open'); }

    // ── Utilities ─────────────────────────────────────────────────────────────
    function fmtNum(n) { return parseInt(n || 0).toLocaleString('en-PK'); }
    function esc(s) { return $('<span>').text(s || '').html(); }
    function emptyRow(cols) {
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted)">📂 No records found</td></tr>`;
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    $(document).ready(function () {
        loadDashboard();
        const yr = new Date().getFullYear();
        const yrs = Array.from({ length: 5 }, (_, i) => yr - i)
            .map(y => `<option value="${y}">${y}</option>`).join('');
        $('#report-year').html(yrs);
    });

})(jQuery);
