/**
 * Pak-Munshi Pro — Frontend App Logic (Lawyer Case Management)
 * Designed and Developed by Sami Khan - SQ Tech
 */
(function ($) {
    'use strict';

    // Retrieve WordPress Localized Variables
    const AJAX = munshi_ajax.ajax_url;
    const NONCE = munshi_ajax.nonce;

    // ── Toast Notifications ───────────────────────────────────────────────────
    function toast(msg, type = 'info') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const $t = $(`<div class="toast-item ${type}"><span class="toast-dot">${icons[type]||'ℹ️'}</span><span>${msg}</span></div>`);
        $('#munshi-toast').append($t);
        setTimeout(() => $t.fadeOut(400, () => $t.remove()), 3500);
    }

    // ── Generic AJAX Requester ────────────────────────────────────────────────
    function ajax(action, data = {}, cb) {
        $.post(AJAX, { action: 'munshi_' + action, nonce: NONCE, ...data })
            .done(res => { 
                if (res.success) cb(null, res.data); 
                else cb(res.data || 'Error'); 
            })
            .fail(() => cb('Network connection failed.'));
    }

    // ── Navigation Tab switcher ───────────────────────────────────────────────
    $(document).on('click', '.nav-item', function () {
        const section = $(this).data('section');
        if (!section) return;
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        $('.munshi-section').removeClass('active');
        
        // Mapped elements for DOM ID compatibility
        let targetId = section;
        if (section === 'cases') targetId = 'cases';
        else if (section === 'tenants') targetId = 'tenants';
        else if (section === 'units') targetId = 'units';
        
        $('#section-' + targetId).addClass('active');
        $('#topbar-title').text($(this).find('.nav-label').text());
        loadSection(section);
    });

    function loadSection(name) {
        const loaders = {
            dashboard: loadDashboard,
            cases: loadCases,
            units: loadHearings,     // units mapped to hearings
            tenants: loadClients,    // tenants mapped to clients
            billing: loadInvoices,
            payments: loadPayments,
            reports: loadReports,
        };
        if (loaders[name]) loaders[name]();
    }

    // ── 1. Dashboard Tab ──────────────────────────────────────────────────────
    function loadDashboard() {
        ajax('dashboard_init', {}, (err, data) => {
            if (err) return toast(err, 'error');
            const k = data.kpi;
            
            // Map KPIs
            $('#kpi-properties').text(k.active_cases || 0);
            $('#kpi-occupied').text(k.pending_hearings || 0);
            $('#kpi-vacant').text(k.clients || 0);
            $('#kpi-dues').text('Rs. ' + fmtNum(k.total_dues || 0));
            $('#kpi-revenue').text('Rs. ' + fmtNum(k.this_month_revenue || 0));

            // Populate Recent payments
            let html = '';
            (data.recent_payments || []).forEach(p => {
                html += `<tr>
                    <td>${esc(p.receipt_number)}</td>
                    <td>${esc(p.client_name)}</td>
                    <td>Rs. ${fmtNum(p.amount)}</td>
                    <td>${p.paid_date}</td>
                    <td><span class="badge badge-green">Received</span></td>
                </tr>`;
            });
            $('#recent-payments-tbody').html(html || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">No recent payments</td></tr>');

            // Populate Upcoming hearings
            let dues = '';
            (data.upcoming_dues || []).forEach(h => {
                dues += `<tr>
                    <td><strong>${esc(h.case_title)}</strong><br><small class="muted">${esc(h.case_number)}</small></td>
                    <td>${h.hearing_date} ${h.hearing_time ? '@ ' + h.hearing_time : ''}</td>
                    <td>${esc(h.court_name)}</td>
                    <td>${esc(h.purpose)}</td>
                    <td><span class="badge badge-blue">${esc(h.status)}</span></td>
                </tr>`;
            });
            $('#upcoming-dues-tbody').html(dues || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">No upcoming hearings</td></tr>');
        });
    }

    // ── 2. Court Cases Tab ────────────────────────────────────────────────────
    function loadCases() {
        ajax('get_cases', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#properties-tbody').html(emptyRow(7)); return; }
            data.forEach(c => {
                const priorityBadge = c.priority === 'URGENT' || c.priority === 'HIGH' ? 'badge-red' : 'badge-gray';
                const nextDate = c.next_hearing_date ? c.next_hearing_date.split(' ')[0] : 'None';
                html += `<tr>
                    <td><strong>${esc(c.case_title)}</strong><br><small class="muted">No. ${esc(c.case_number)}</small></td>
                    <td>${esc(c.client_name)}<br><small class="muted">${esc(c.client_phone)}</small></td>
                    <td>${esc(c.case_type)}</td>
                    <td>${esc(c.court_name)}</td>
                    <td>${esc(c.judge_name || '—')}</td>
                    <td><span class="badge badge-blue">${c.status}</span><br><span class="badge ${priorityBadge}" style="margin-top:4px">${c.priority}</span></td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-property" data-id="${c.id}">✏️ Edit</button>
                        <button class="btn btn-danger btn-xs del-property" data-id="${c.id}" data-name="${esc(c.case_title)}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#properties-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-property', () => openCaseModal());
    $(document).on('click', '.edit-property', function () {
        const id = $(this).data('id');
        ajax('get_cases', {}, (err, cases) => {
            if (err) return;
            const c = cases.find(item => item.id == id);
            if (c) {
                openCaseModal({
                    id: c.id,
                    client_id: c.client_id,
                    case_title: c.case_title,
                    case_number: c.case_number,
                    case_type: c.case_type,
                    court_name: c.court_name,
                    judge_name: c.judge_name,
                    opposite_party: c.opposite_party,
                    opposite_counsel: c.opposite_counsel,
                    fir_number: c.fir_number,
                    police_station: c.police_station,
                    description: c.description,
                    internal_notes: c.internal_notes,
                    status: c.status,
                    priority: c.priority,
                    next_hearing_date: c.next_hearing_date ? c.next_hearing_date.split(' ')[0] : ''
                });
            }
        });
    });

    $(document).on('click', '.del-property', function () {
        const id = $(this).data('id'), name = $(this).data('name');
        if (!confirm(`Are you sure you want to delete case file "${name}"? All related hearings will be deleted.`)) return;
        ajax('delete_case', { id }, (err) => {
            if (err) return toast(err, 'error');
            toast('Case deleted.', 'success'); loadCases();
        });
    });

    function openCaseModal(data = {}) {
        $('#form-property')[0].reset();
        $('#prop-id').val(data.id || '');
        
        // Populate Client Dropdown
        ajax('get_clients', {}, (err, clients) => {
            if (err) return;
            let opts = clients.map(cl => `<option value="${cl.id}">${esc(cl.name)} (${esc(cl.phone)})</option>`).join('');
            $('#prop-client').html('<option value="">Select Client</option>' + opts);
            if (data.client_id) $('#prop-client').val(data.client_id);
        });

        if (data.id) {
            $('#prop-name').val(data.case_title || '');
            $('#prop-address').val(data.case_number || '');
            $('#prop-type').val(data.case_type || 'Civil');
            $('#prop-floors').val(data.court_name || '');
            $('[name="judge_name"]').val(data.judge_name || '');
            $('[name="opposite_party"]').val(data.opposite_party || '');
            $('[name="opposite_counsel"]').val(data.opposite_counsel || '');
            $('[name="fir_number"]').val(data.fir_number || '');
            $('[name="police_station"]').val(data.police_station || '');
            $('[name="priority"]').val(data.priority || 'MEDIUM');
            $('#prop-status').val(data.status || 'ONGOING');
            $('[name="description"]').val(data.description || '');
            $('[name="internal_notes"]').val(data.internal_notes || '');
        }

        $('#modal-property').addClass('open');
    }

    $(document).on('submit', '#form-property', function (e) {
        e.preventDefault();
        ajax('save_case', $(this).serialize(), (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message, 'success');
            closeModal('#modal-property');
            loadCases();
        });
    });

    // ── 3. Court Hearings Diary Tab ──────────────────────────────────────────
    function loadHearings() {
        ajax('get_hearings', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#units-tbody').html(emptyRow(6)); return; }
            data.forEach(h => {
                const badge = h.status === 'SCHEDULED' ? 'badge-blue' : h.status === 'HEARD' ? 'badge-green' : 'badge-red';
                html += `<tr>
                    <td><strong>${esc(h.case_title)}</strong><br><small class="muted">${esc(h.case_number)}</small></td>
                    <td><strong>${h.hearing_date}</strong>${h.hearing_time ? '<br><small class="muted">' + h.hearing_time + '</small>' : ''}</td>
                    <td>${esc(h.court_name)}</td>
                    <td>${esc(h.purpose)}</td>
                    <td><span class="badge ${badge}">${h.status}</span></td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-unit" data-id="${h.id}">✏️</button>
                        <button class="btn btn-danger btn-xs del-unit" data-id="${h.id}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#units-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-unit', () => openHearingModal());
    $(document).on('click', '.edit-unit', function () {
        const id = $(this).data('id');
        ajax('get_hearings', {}, (err, hearings) => {
            if (err) return;
            const h = hearings.find(item => item.id == id);
            if (h) {
                openHearingModal({
                    id: h.id,
                    case_id: h.case_id,
                    hearing_date: h.hearing_date,
                    hearing_time: h.hearing_time,
                    court_name: h.court_name,
                    purpose: h.purpose,
                    status: h.status,
                    next_hearing_date: h.next_hearing_date,
                    order_summary: h.order_summary,
                    remarks: h.remarks
                });
            }
        });
    });

    $(document).on('click', '.del-unit', function () {
        if (!confirm('Are you sure you want to delete this hearing record?')) return;
        ajax('delete_hearing', { id: $(this).data('id') }, (err) => {
            if (err) return toast(err, 'error');
            toast('Hearing deleted.', 'success'); loadHearings();
        });
    });

    function openHearingModal(data = {}) {
        $('#unit-form')[0].reset();
        $('#unit-id').val(data.id || '');
        
        // Populate Cases dropdown
        ajax('get_cases', {}, (err, cases) => {
            if (err) return;
            let opts = cases.map(c => `<option value="${c.id}">${esc(c.case_title)} (${esc(c.case_number)})</option>`).join('');
            $('#unit-property').html('<option value="">Select Case</option>' + opts);
            if (data.case_id) $('#unit-property').val(data.case_id);
        });

        if (data.id) {
            $('[name="hearing_date"]').val(data.hearing_date || '');
            $('[name="hearing_time"]').val(data.hearing_time || '');
            $('[name="court_name"]').val(data.court_name || '');
            $('[name="purpose"]').val(data.purpose || '');
            $('[name="status"]').val(data.status || 'SCHEDULED');
            $('[name="next_hearing_date"]').val(data.next_hearing_date || '');
            $('[name="order_summary"]').val(data.order_summary || '');
            $('[name="remarks"]').val(data.remarks || '');
        }

        $('#modal-unit').addClass('open');
    }

    $(document).on('submit', '#unit-form', function (e) {
        e.preventDefault();
        ajax('save_hearing', $(this).serialize(), (err, res) => {
            if (err) return toast(err, 'error');
            toast(res.message, 'success'); closeModal('#modal-unit'); loadHearings();
        });
    });

    // ── 4. Clients Directory Tab ──────────────────────────────────────────────
    function loadClients() {
        ajax('get_clients', {}, (err, data) => {
            if (err) return toast(err, 'error');
            let html = '';
            if (!data.length) { $('#tenants-tbody').html(emptyRow(7)); return; }
            data.forEach(cl => {
                html += `<tr>
                    <td><strong>${esc(cl.name)}</strong><br><small class="muted">CNIC: ${esc(cl.cnic || '—')}</small></td>
                    <td>${esc(cl.phone)}</td>
                    <td>${esc(cl.whatsapp || '—')}</td>
                    <td>${esc(cl.email || '—')}</td>
                    <td>${cl.total_cases || 0}</td>
                    <td><span class="badge ${cl.active_cases > 0 ? 'badge-red' : 'badge-gray'}">${cl.active_cases || 0} Active</span></td>
                    <td class="actions">
                        <button class="btn btn-glass btn-xs edit-tenant" data-id="${cl.id}">✏️</button>
                        <button class="btn btn-primary btn-xs gen-invoice" data-id="${cl.id}" data-name="${esc(cl.name)}">🧾 Fee</button>
                        <button class="btn btn-danger btn-xs del-tenant" data-id="${cl.id}">🗑</button>
                    </td>
                </tr>`;
            });
            $('#tenants-tbody').html(html);
        });
    }

    $(document).on('click', '#btn-add-tenant', () => openClientModal());
    $(document).on('click', '.edit-tenant', function () {
        const id = $(this).data('id');
        ajax('get_clients', {}, (err, clients) => {
            if (err) return;
            const cl = clients.find(item => item.id == id);
            if (cl) {
                openClientModal({
                    id: cl.id,
                    name: cl.name,
                    email: cl.email,
                    phone: cl.phone,
                    whatsapp: cl.whatsapp,
                    cnic: cl.cnic,
                    address: cl.address,
                    notes: cl.notes
                });
            }
        });
    });

    $(document).on('click', '.del-tenant', function () {
        if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) return;
        ajax('delete_client', { id: $(this).data('id') }, (err) => {
            if (err) return toast(err, 'error');
            toast('Client removed successfully.', 'success'); loadClients();
        });
    });

    function openClientModal(data = {}) {
        $('#tenant-form')[0].reset();
        $('#tenant-id').val(data.id || '');
        if (data.id) {
            $('[name="name"]').val(data.name || '');
            $('[name="email"]').val(data.email || '');
            $('[name="phone"]').val(data.phone || '');
            $('[name="whatsapp"]').val(data.whatsapp || '');
            $('[name="cnic"]').val(data.cnic || '');
            $('[name="address"]').val(data.address || '');
            $('[name="notes"]').val(data.notes || '');
        }
        $('#modal-tenant').addClass('open');
    }

    $(document).on('submit', '#tenant-form', function (e) {
        e.preventDefault();
        const fd = new FormData(this);
        fd.append('action', 'munshi_save_client');
        fd.append('nonce', NONCE);
        
        $.ajax({ url: AJAX, type: 'POST', data: fd, processData: false, contentType: false })
            .done(res => {
                if (res.success) { 
                    toast(res.data.message, 'success'); 
                    closeModal('#modal-tenant'); 
                    loadClients(); 
                } else {
                    toast(res.data, 'error');
                }
            })
            .fail(() => toast('Network error occurred.', 'error'));
    });

    // ── 5. Fee Invoices Tab ───────────────────────────────────────────────────
    $(document).on('click', '.gen-invoice', function () {
        $('#inv-tenant-id').val($(this).data('id'));
        $('#inv-tenant-name').text($(this).data('name'));
        $('#inv-case-select').html('<option value="">General Consultation</option>');
        
        // Populate client-specific cases
        ajax('get_cases', {}, (err, cases) => {
            if (!err) {
                const clientCases = cases.filter(c => c.client_id == $(this).data('id'));
                let opts = clientCases.map(c => `<option value="${c.id}">${esc(c.case_title)} (${esc(c.case_number)})</option>`).join('');
                $('#inv-case-select').html('<option value="">General Consultation</option>' + opts);
            }
        });
        
        $('#inv-other').val(new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0, 10)); // default due date = 7 days
        $('#inv-tenant-select').hide();
        $('#modal-invoice').addClass('open');
    });

    $(document).on('click', '#btn-add-invoice', () => {
        ajax('get_clients', {}, (err, clients) => {
            if (err) return;
            let opts = clients.map(cl => `<option value="${cl.id}">${esc(cl.name)} — ${esc(cl.phone)}</option>`).join('');
            $('#inv-tenant-select').html('<option value="">Select Client</option>' + opts).show();
            $('#inv-tenant-id').val('');
            $('#inv-tenant-name').text('');
            $('#inv-case-select').html('<option value="">Select client first</option>');
            $('#modal-invoice').addClass('open');
        });
    });

    $(document).on('change', '#inv-tenant-select', function() {
        const clId = $(this).val();
        if (!clId) {
            $('#inv-case-select').html('<option value="">Select client first</option>');
            return;
        }
        ajax('get_cases', {}, (err, cases) => {
            if (!err) {
                const clientCases = cases.filter(c => c.client_id == clId);
                let opts = clientCases.map(c => `<option value="${c.id}">${esc(c.case_title)} (${esc(c.case_number)})</option>`).join('');
                $('#inv-case-select').html('<option value="">General Consultation</option>' + opts);
            }
        });
    });

    $(document).on('submit', '#invoice-form', function (e) {
        e.preventDefault();
        const clientId = $('#inv-tenant-id').val() || $('#inv-tenant-select').val();
        ajax('generate_invoice', {
            tenant_id: clientId, // mapped parameter name
            case_id: $('#inv-case-select').val() || 0,
            amount: $('#inv-elec-units').val(),      // mapped Agreed Fee
            discount: $('#inv-elec-rate').val() || 0, // mapped Discount
            due_date: $('#inv-other').val(),         // mapped Due Date
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
            if (!data.length) { $('#invoices-tbody').html(emptyRow(7)); return; }
            data.forEach(i => {
                const badge = i.status === 'Paid' ? 'badge-green' : i.status === 'Partial' ? 'badge-yellow' : 'badge-red';
                const caseInfo = i.case_title ? esc(i.case_title) + `<br><small class="muted">${esc(i.case_number)}</small>` : '<span class="muted">General Consultation</span>';
                html += `<tr>
                    <td><strong>${esc(i.invoice_number)}</strong></td>
                    <td>${esc(i.client_name)}</td>
                    <td>${caseInfo}</td>
                    <td>Rs. ${fmtNum(i.total_amount)}</td>
                    <td class="${i.balance > 0 ? 'status-maintenance' : ''}">Rs. ${fmtNum(i.balance)}</td>
                    <td><span class="badge ${badge}">${i.status}</span></td>
                    <td class="actions">
                        ${i.balance > 0 ? `<button class="btn btn-success btn-xs record-payment" data-id="${i.id}" data-num="${esc(i.invoice_number)}" data-balance="${i.balance}">💰 Pay</button>` : ''}
                        <button class="btn btn-glass btn-xs download-invoice" data-id="${i.id}">📄 PDF</button>
                    </td>
                </tr>`;
            });
            $('#invoices-tbody').html(html);
        });
    }

    // ── 6. Payments Ledger Tab ────────────────────────────────────────────────
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
            if (!data.length) { $('#payments-tbody').html(emptyRow(5)); return; }
            data.forEach(p => {
                html += `<tr>
                    <td>${esc(p.receipt_number)}</td>
                    <td>${esc(p.client_name)}</td>
                    <td>${esc(p.invoice_number)} (${esc(p.paid_date)})</td>
                    <td><strong>Rs. ${fmtNum(p.amount)}</strong></td>
                    <td><span class="badge badge-blue">${esc(p.payment_method)}</span></td>
                </tr>`;
            });
            $('#payments-tbody').html(html);
        });
    }

    // ── 7. Analytics & Reports Tab ────────────────────────────────────────────
    function loadReports() {
        const year = $('#report-year').val() || new Date().getFullYear();
        ajax('get_analytics', { year }, (err, data) => {
            if (err) return toast(err, 'error');
            const k = data.kpi;
            
            // Map Reports KPIs
            $('#rpt-properties').text(k.active_cases || 0);
            $('#rpt-occupied').text(k.closed_cases || 0);
            $('#rpt-tenants').text(k.clients || 0);
            $('#rpt-dues').text('Rs. ' + fmtNum(k.total_dues || 0));
            $('#rpt-revenue').text('Rs. ' + fmtNum(k.yearly_revenue || 0));
            drawChart(data.revenue, data.billed);

            let expHtml = '';
            (data.expiring || []).forEach(h => {
                expHtml += `<tr>
                    <td><strong>${esc(h.case_title)}</strong><br><small class="muted">${esc(h.case_number)}</small></td>
                    <td>${h.hearing_date} ${h.hearing_time ? '@ ' + h.hearing_time : ''}</td>
                    <td>${esc(h.court_name)}</td>
                    <td>${esc(h.purpose)}</td>
                </tr>`;
            });
            $('#expiring-tbody').html(expHtml || '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">No hearings scheduled in the next 30 days</td></tr>');
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

        // Draw grid lines
        ctx.strokeStyle = 'rgba(99,179,237,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (H / 4) * i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + W, y); ctx.stroke();
            ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
            ctx.fillText('Rs.' + fmtNum(max - (max / 4) * i), pad.left - 8, y + 4);
        }

        // Draw Billed bars
        months.forEach((m, i) => {
            const x = pad.left + i * barW + barW * 0.1;
            const bH = (billedArr[i] / max) * H;
            ctx.fillStyle = 'rgba(59,130,246,0.25)';
            ctx.beginPath();
            ctx.roundRect(x, pad.top + H - bH, barW * 0.38, bH, 4);
            ctx.fill();
        });

        // Draw Collected bars
        months.forEach((m, i) => {
            const x = pad.left + i * barW + barW * 0.52;
            const bH = (collected[i] / max) * H;
            ctx.fillStyle = 'rgba(16,185,129,0.7)';
            ctx.beginPath();
            ctx.roundRect(x, pad.top + H - bH, barW * 0.38, bH, 4);
            ctx.fill();
        });

        // Draw X-axis month labels
        ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.font = '11px Inter,sans-serif';
        months.forEach((m, i) => {
            ctx.fillText(m, pad.left + i * barW + barW / 2, canvas.height - 10);
        });
    }

    $(document).on('change', '#report-year', loadReports);

    // ── PDF Download Integration ──────────────────────────────────────────────
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

    // ── Table Live Search ─────────────────────────────────────────────────────
    $(document).on('input', '.live-search', function () {
        const q = $(this).val().toLowerCase();
        const target = $(this).data('target');
        $(target + ' tbody tr').each(function () {
            $(this).toggle($(this).text().toLowerCase().includes(q));
        });
    });

    // ── Modals Close Helpers ──────────────────────────────────────────────────
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
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted)">📂 No active records found.</td></tr>`;
    }

    // ── App Start ─────────────────────────────────────────────────────────────
    $(document).ready(function () {
        loadDashboard();
        const yr = new Date().getFullYear();
        const yrs = Array.from({ length: 5 }, (_, i) => yr - i)
            .map(y => `<option value="${y}">${y}</option>`).join('');
        $('#report-year').html(yrs);
    });

})(jQuery);
