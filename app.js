(() => {
  "use strict";
  const STORAGE_KEY = "ledger-mini-data-v1";
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value) || 0);
  const today = () => new Date().toLocaleDateString("en-CA");
  const dateLabel = (value) => {
    if (!value) return "未设置日期";
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
  };
  const safeText = (value) => String(value ?? "");
  const initials = (value) => {
    const s = safeText(value).trim();
    return s ? Array.from(s).slice(0, 2).join("").toUpperCase() : "—";
  };
  let data = loadData();
  let orderFilter = "all";
  let detailContext = null;
  let toastTimer;

  function loadData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"customers":[],"orders":[]}');
      return {
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        business: parsed.business && typeof parsed.business === "object" ? parsed.business : {}
      };
    } catch {
      return { customers: [], orders: [], projects: [], invoices: [], business: {} };
    }
  }
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderAll();
    } catch (err) {
      showToast("保存失败：存储空间可能不足，请导出备份");
    }
  }
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function escapeHTML(value) {
    return safeText(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function emptyState(icon, title, body, actionLabel, actionId) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(body)}</p>${actionLabel ? `<button class="primary-button compact" style="margin-top:14px" id="${actionId}">${escapeHTML(actionLabel)}</button>` : ""}</div>`;
  }
  function statusClass(status) {
    return ({ "待处理": "status-pending", "处理中": "status-progress", "已完成": "status-complete", "已取消": "status-cancelled" })[status] || "status-pending";
  }
  function customerName(id) {
    return data.customers.find(c => c.id === id)?.name || "未关联客户";
  }
  function orderMarkup(order) {
    return `<button class="list-row order-open" data-id="${escapeHTML(order.id)}" style="width:100%;text-align:left;color:inherit">
      <span class="list-avatar">${escapeHTML(initials(order.title))}</span>
      <span class="list-main"><span class="list-title">${escapeHTML(order.title)}</span><span class="list-subtitle">${escapeHTML(customerName(order.customerId))} · ${escapeHTML(dateLabel(order.date))}</span></span>
      <span class="list-trailing"><span class="list-amount">${money(order.amount)}</span><br><span class="status ${statusClass(order.status)}">${escapeHTML(order.status)}</span></span>
    </button>`;
  }
  function customerMarkup(customer) {
    const count = data.orders.filter(o => o.customerId === customer.id).length;
    return `<button class="list-row customer-open" data-id="${escapeHTML(customer.id)}" style="width:100%;text-align:left;color:inherit">
      <span class="list-avatar">${escapeHTML(initials(customer.name))}</span>
      <span class="list-main"><span class="list-title">${escapeHTML(customer.name)}</span><span class="list-subtitle">${escapeHTML(customer.contact || customer.email || customer.phone || "暂无联系人信息")}</span></span>
      <span class="list-trailing"><span class="list-amount">${count}</span><br><span class="muted" style="font-size:9px">笔订单</span></span>
    </button>`;
  }
  function renderDashboard() {
    $("todayLabel").textContent = new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    const total = data.orders.filter(o => o.status !== "已取消").reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    $("totalValue").textContent = money(total);
    $("orderCountLabel").textContent = `${data.orders.length} 笔订单`;
    $("customerCount").textContent = data.customers.length;
    $("pendingCount").textContent = data.orders.filter(o => o.status === "待处理" || o.status === "处理中").length;
    $("settingsCustomerCount").textContent = data.customers.length;
    $("settingsOrderCount").textContent = data.orders.length;
    const recent = [...data.orders].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 4);
    $("recentOrders").innerHTML = recent.length ? recent.map(orderMarkup).join("") : emptyState("▤", "还没有订单", "创建第一笔订单后，这里会显示最近活动。", "＋ 新建订单", "emptyAddOrder");
    const emptyBtn = $("emptyAddOrder");
    if (emptyBtn) emptyBtn.addEventListener("click", () => openOrderForm());
  }
  function renderCustomers() {
    const q = $("customerSearch").value.trim().toLowerCase();
    const rows = [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).filter(c => [c.name, c.contact, c.email, c.phone].some(v => safeText(v).toLowerCase().includes(q)));
    $("customerListMeta").textContent = `${rows.length} 位客户`;
    $("customersList").innerHTML = rows.length ? rows.map(customerMarkup).join("") : emptyState("◎", q ? "没有找到客户" : "从第一个客户开始", q ? "试试其他搜索关键词。" : "保存客户资料后，可以在创建订单时关联客户。", q ? "" : "＋ 新增客户", "emptyAddCustomer");
    const btn = $("emptyAddCustomer");
    if (btn) btn.addEventListener("click", () => openCustomerForm());
  }
  function renderOrders() {
    const q = $("orderSearch").value.trim().toLowerCase();
    const rows = [...data.orders].sort((a, b) => (b.date || "").localeCompare(a.date || "")).filter(o => {
      const matchesFilter = orderFilter === "all" || o.status === orderFilter;
      const matchesSearch = [o.title, customerName(o.customerId), o.notes, o.status].some(v => safeText(v).toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
    $("orderListMeta").textContent = `${rows.length} 笔订单`;
    $("ordersList").innerHTML = rows.length ? rows.map(orderMarkup).join("") : emptyState("▤", q || orderFilter !== "all" ? "没有匹配的订单" : "还没有订单", "你可以新增订单，或调整筛选条件。", q || orderFilter !== "all" ? "" : "＋ 新建订单", "emptyAddOrderList");
    const btn = $("emptyAddOrderList");
    if (btn) btn.addEventListener("click", () => openOrderForm());
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("selected", b.dataset.filter === orderFilter));
  }
  function projectName(id) { return data.projects.find(p => p.id === id)?.name || "已删除项目"; }
  function invoiceNumber(inv) { return inv.number || `INV-${String(inv.id || "").slice(-6).toUpperCase()}`; }
  function lineSubtotal(line) { return (Number(line.qty) || 0) * (Number(line.rate) || 0); }
  function lineGST(line) { return lineSubtotal(line) * (Number(line.gstRate) || 0) / 100; }
  function lineTotal(line) { return lineSubtotal(line) + lineGST(line); }
  function sumLines(lines) { return (lines || []).reduce((s, line) => s + lineTotal(line), 0); }
  function lineEditorMarkup(line = {}) {
    const options = `<option value="">选择收费项目</option>` + data.projects.slice().sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${escapeHTML(p.id)}" ${p.id === line.projectId ? "selected" : ""}>${escapeHTML(p.name)} · ${money(p.rate)}/${escapeHTML(p.unit || "unit")}</option>`).join("");
    return `<div class="line-item-row">
      <select class="line-project" aria-label="收费项目">${options}</select>
      <div class="line-item-fields">
        <label>数量<input class="line-qty" type="number" min="0.01" step="0.01" value="${escapeHTML(line.qty ?? 1)}"></label>
        <label>单价（AUD）<input class="line-rate" type="number" min="0" step="0.01" value="${escapeHTML(line.rate ?? "")}"></label>
      </div>
      <label class="line-description-label">项目说明 / Description<textarea class="line-description" rows="2" maxlength="500" placeholder="可填写本次服务的具体说明（可选）">${escapeHTML(line.description || "")}</textarea></label>
      <label class="line-gst-label">GST<select class="line-gst"><option value="0" ${Number(line.gstRate || 0) === 0 ? "selected" : ""}>不加 GST（0%）</option><option value="10" ${Number(line.gstRate || 0) === 10 ? "selected" : ""}>加 GST 10%</option></select></label>
      <div class="line-item-bottom"><span class="line-total">${money(lineTotal(line))}</span><button type="button" class="text-button remove-line">移除</button></div>
    </div>`;
  }
  function renderLineEditors(containerId, lines = []) {
    const container = $(containerId);
    container.innerHTML = lines.length ? lines.map(lineEditorMarkup).join("") : `<p class="muted small line-empty">暂无项目，请点击“添加项目”。先在“项目”页面建立收费项目。</p>`;
    container.querySelectorAll(".line-item-row").forEach(row => {
      const select = row.querySelector(".line-project");
      select.addEventListener("change", () => {
        const p = data.projects.find(x => x.id === select.value);
        if (p) row.querySelector(".line-rate").value = Number(p.rate) || 0;
        updateLineEditorTotals(containerId);
      });
      row.querySelectorAll(".line-qty,.line-rate").forEach(input => input.addEventListener("input", () => updateLineEditorTotals(containerId)));
      row.querySelector(".line-gst")?.addEventListener("change", () => updateLineEditorTotals(containerId));
      row.querySelector(".remove-line").addEventListener("click", () => { row.remove(); updateLineEditorTotals(containerId); });
    });
    updateLineEditorTotals(containerId);
  }
  function readLineEditors(containerId) {
    return [...$(containerId).querySelectorAll(".line-item-row")].map(row => {
      const projectId = row.querySelector(".line-project").value;
      const project = data.projects.find(p => p.id === projectId);
      return { projectId, name: project?.name || row.querySelector(".line-project").selectedOptions[0]?.textContent || "项目", unit: project?.unit || "unit",
        description: row.querySelector(".line-description")?.value.trim() || "",
        qty: Math.max(0, Number(row.querySelector(".line-qty").value) || 0), rate: Math.max(0, Number(row.querySelector(".line-rate").value) || 0), gstRate: Number(row.querySelector(".line-gst")?.value || 0) };
    }).filter(line => line.projectId && line.qty > 0);
  }
  function updateLineEditorTotals(containerId) {
    const rows = [...$(containerId).querySelectorAll(".line-item-row")];
    rows.forEach(row => {
      const total = (Number(row.querySelector(".line-qty").value) || 0) * (Number(row.querySelector(".line-rate").value) || 0);
      row.querySelector(".line-total").textContent = money(total);
    });
    const lines = readLineEditors(containerId);
    const total = sumLines(lines);
    if (containerId === "orderLineItems") $("orderAmount").value = total.toFixed(2);
    if (containerId === "invoiceLineItems") $("invoiceTotal").textContent = money(total);
  }
  function renderProjects() {
    const list = $("projectsList");
    if (!list) return;
    const rows = [...data.projects].sort((a,b) => a.name.localeCompare(b.name));
    list.innerHTML = rows.length ? rows.map(p => `<div class="list-row project-list-row">
      <span class="list-avatar">◇</span>
      <span class="list-main project-list-main">
        <span class="list-title">${escapeHTML(p.name)}</span>
        <span class="project-price">${money(p.rate)} / ${escapeHTML(p.unit || "unit")}</span>
        ${p.description ? `<span class="project-description">${escapeHTML(p.description)}</span>` : `<span class="project-description muted">暂无说明</span>`}
      </span>
      <span class="list-trailing project-list-actions"><button class="text-button edit-project" data-id="${escapeHTML(p.id)}">编辑</button><button class="text-button delete-project" data-id="${escapeHTML(p.id)}">删除</button></span></div>`).join("") : emptyState("◇", "还没有收费项目", "先创建项目名称、计费单位和单价。", "＋ 新项目", "emptyAddProject");
    const empty = $("emptyAddProject"); if (empty) empty.addEventListener("click", () => openProjectForm());
    list.querySelectorAll(".edit-project").forEach(b => b.addEventListener("click", () => openProjectForm(b.dataset.id)));
    list.querySelectorAll(".delete-project").forEach(b => b.addEventListener("click", () => {
      if (!confirm("确定删除此项目？已保存的订单和发票明细不会被删除。")) return;
      data.projects = data.projects.filter(p => p.id !== b.dataset.id); saveData(); showToast("项目已删除");
    }));
  }
  function renderInvoices() {
    const list = $("invoicesList"); if (!list) return;
    const q = ($("invoiceSearch")?.value || "").trim().toLowerCase();
    const rows = [...data.invoices].sort((a,b) => (b.date || "").localeCompare(a.date || "")).filter(i => [invoiceNumber(i), customerName(i.customerId), i.notes].some(v => safeText(v).toLowerCase().includes(q)));
    list.innerHTML = rows.length ? rows.map(i => `<button class="list-row invoice-open" data-id="${escapeHTML(i.id)}" style="width:100%;text-align:left;color:inherit">
      <span class="list-avatar">▧</span><span class="list-main"><span class="list-title">${escapeHTML(invoiceNumber(i))}</span><span class="list-subtitle">${escapeHTML(customerName(i.customerId))} · ${escapeHTML(dateLabel(i.date))}</span></span>
      <span class="list-trailing"><span class="list-amount">${money(i.total)}</span><br><span class="status ${i.status === "已发送" ? "status-progress" : "status-pending"}">${escapeHTML(i.status || "草稿")}</span></span></button>`).join("") : emptyState("▧", "还没有发票", "可以新建发票，或从订单详情生成发票。", "＋ 新发票", "emptyAddInvoice");
    const empty = $("emptyAddInvoice"); if (empty) empty.addEventListener("click", () => openInvoiceForm());
    list.querySelectorAll(".invoice-open").forEach(b => b.addEventListener("click", () => openInvoiceDetail(b.dataset.id)));
  }
  function openProjectForm(id = "") {
    const p = data.projects.find(x => x.id === id);
    $("projectForm").reset(); $("projectId").value = p?.id || "";
    $("projectDialogTitle").textContent = p ? "编辑项目" : "新项目";
    $("projectName").value = p?.name || ""; $("projectUnit").value = p?.unit || "unit";
    $("projectRate").value = p?.rate ?? ""; $("projectDescription").value = p?.description || "";
    $("projectDialog").showModal();
  }
  function exportOrderInvoice(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return;
    const lines = order.lines?.length ? order.lines : [{ name: order.title || "Service", unit: "unit", qty: 1, rate: Number(order.amount) || 0, gstRate: 0 }];
    const subtotal = lines.reduce((s, line) => s + lineSubtotal(line), 0);
    const gstTotal = lines.reduce((s, line) => s + lineGST(line), 0);
    const total = subtotal + gstTotal;
    const totalPaid = order.paymentStatus === "paid" ? total : 0;
    const amountOwing = Math.max(0, total - totalPaid);
    const number = `INV-${new Date().getFullYear()}-${String(Math.max(1, data.orders.indexOf(order) + 1)).padStart(4, "0")}`;
    const customer = data.customers.find(c => c.id === order.customerId);
    const b = data.business || {};
    const invoiceWindow = window.open("", "_blank");
    if (!invoiceWindow) return showToast("请允许弹出窗口后重试");
    const rows = lines.map(l => `<tr>
      <td class="description"><strong>${escapeHTML(l.name || projectName(l.projectId))}</strong>${l.description ? `<div class="sub">${escapeHTML(l.description)}</div>` : ""}</td>
      <td class="num">${escapeHTML(l.qty ?? 1)}</td><td class="num">${escapeHTML(l.unit || "unit")}</td>
      <td class="num">${money(l.rate || 0)}</td><td class="num">${Number(l.gstRate || 0) ? money(lineGST(l)) : "$0.00"}</td><td class="num">${money(lineTotal(l))}</td>
    </tr>`).join("");
    const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(number)}</title>
    <style>
      *{box-sizing:border-box}body{margin:0;background:#edf0f4;color:#171717;font:12px Arial,Helvetica,sans-serif}
      .toolbar{max-width:900px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;gap:10px}
      button{border:0;border-radius:8px;padding:11px 16px;font-weight:700;font-size:13px;cursor:pointer}.back{background:#e0e5ec;color:#172033}.pdf{background:#163e69;color:white}
      .paper{background:#fff;max-width:900px;margin:0 auto 28px;padding:42px 48px;box-shadow:0 2px 16px #00000012}
      .brandrow{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;padding-bottom:26px}
      .brandmark{font-size:25px;font-weight:800;letter-spacing:-.8px;max-width:48%;overflow-wrap:anywhere}.brandmark span{color:#24649b}
      .supplier{text-align:right;line-height:1.65;max-width:52%;overflow-wrap:anywhere}.supplier strong{font-size:14px}
      .title{text-align:center;font-size:21px;font-weight:700;margin:0 0 10px}
      .rule{border:0;border-top:1px solid #222;margin:0 0 16px}
      .meta{display:grid;grid-template-columns:1.2fr 1fr;gap:26px;margin-bottom:28px;line-height:1.7}
      .meta-title{font-weight:bold;margin-bottom:8px}.meta-right div{display:flex;gap:5px}.meta-right b{white-space:nowrap}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
      th{font-weight:700;text-align:left;border-bottom:1px solid #222;border-top:1px solid #222;padding:8px 6px;background:#f8f8f8}
      td{padding:10px 6px;border-bottom:1px solid #555;vertical-align:middle}
      th:first-child{width:48%}th:nth-child(2){width:8%}th:nth-child(3){width:9%}th:nth-child(4){width:12%}th:nth-child(5){width:9%}th:nth-child(6){width:14%}
      .num{text-align:right;white-space:nowrap}.description{line-height:1.45;overflow-wrap:anywhere}.sub{margin-top:3px;color:#555}
      .summary{display:flex;justify-content:flex-end;margin:18px 0 24px}.summary table{width:270px;table-layout:auto;font-size:12px}.summary td{border:0;padding:4px 0}.summary td:last-child{text-align:right;white-space:nowrap}.summary .due td{border-top:1px solid #222;padding-top:9px;font-weight:bold;font-size:13px}
      .section{margin-top:22px}.section h3{font-size:12px;margin:0 0 10px;border-bottom:1px solid #222;padding-bottom:5px}.payment{display:grid;grid-template-columns:1.2fr 1fr;gap:22px;line-height:1.65}.small{font-size:11px;color:#333}
      .comments{min-height:18px;margin-top:18px}.thanks{margin-top:22px;color:#555;font-size:11px}
      @media(max-width:650px){.paper{padding:22px 16px;margin:0}.brandrow{gap:12px}.brandmark{font-size:20px}.supplier{font-size:10px}.meta{gap:12px;font-size:10px}.meta-right b{white-space:normal}table{font-size:9px}th,td{padding:7px 3px}th:first-child{width:39%}th:nth-child(2){width:8%}th:nth-child(3){width:9%}th:nth-child(4){width:14%}th:nth-child(5){width:10%}th:nth-child(6){width:20%}.num{white-space:normal}.payment{grid-template-columns:1fr}.toolbar{padding:10px}}
      @media print{body{background:#fff;font-size:11px}.toolbar{display:none}.paper{max-width:none;margin:0;padding:0;box-shadow:none}@page{size:A4;margin:14mm}tr{break-inside:avoid}.section{break-inside:avoid}}
    </style></head><body>
      <div class="toolbar"><button class="back" onclick="if(history.length>1)history.back();else window.close()">← 返回订单</button><button class="pdf" id="downloadPdfBtn">↓ 下载 PDF</button></div>
      <main class="paper">
        <div class="brandrow"><div class="brandmark">${escapeHTML(b.name || "YOUR BUSINESS")}<br><span>INVOICE</span></div>
          <div class="supplier"><strong>${escapeHTML(b.name || "")}</strong>${b.abn ? `<br><b>ABN:</b> ${escapeHTML(b.abn)}` : ""}${b.address ? `<br>${escapeHTML(b.address).replace(/\n/g,"<br>")}` : ""}${b.phone ? `<br><b>Ph:</b> ${escapeHTML(b.phone)}` : ""}${b.remittanceEmail ? `<br>${escapeHTML(b.remittanceEmail)}` : ""}</div></div>
        <h1 class="title">Tax Invoice</h1><hr class="rule">
        <div class="meta"><div><div class="meta-title">Private and Confidential</div><strong>${escapeHTML(customer?.name || "Customer")}</strong>${customer?.contact ? `<br>${escapeHTML(customer.contact)}` : ""}${customer?.email ? `<br>${escapeHTML(customer.email)}` : ""}${customer?.phone ? `<br>${escapeHTML(customer.phone)}` : ""}</div>
          <div class="meta-right"><div><b>Invoice Number:</b><span>${escapeHTML(number)}</span></div><div><b>Invoice Date:</b><span>${escapeHTML(order.date || today())}</span></div>${order.dueDate ? `<div><b>Due Date:</b><span>${escapeHTML(order.dueDate)}</span></div>` : ""}<div><b>Order:</b><span>${escapeHTML(order.title)}</span></div></div></div>
        <table><thead><tr><th>Service Details</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Rate</th><th class="num">GST</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="comments"><b>Comments</b>${order.notes ? `<div>${escapeHTML(order.notes)}</div>` : ""}</div>
        <div class="summary"><table><tbody><tr><td>Invoice Subtotal</td><td>${money(subtotal)}</td></tr><tr><td>GST Included</td><td>${money(gstTotal)}</td></tr><tr><td>Total Paid</td><td>${money(totalPaid)}</td></tr><tr><td>Total Credited</td><td>$0.00</td></tr><tr class="due"><td>Amount Owing</td><td>${money(amountOwing)}</td></tr></tbody></table></div>
        <section class="section"><h3>Payment Options</h3><div class="payment"><div><strong>Electronic Funds Transfer (EFT)</strong><br>${b.bsb ? `BSB: ${escapeHTML(b.bsb)}<br>` : ""}${b.account ? `Account Number: ${escapeHTML(b.account)}<br>` : ""}${b.accountName ? `Account Name: ${escapeHTML(b.accountName)}<br>` : ""}${b.remittanceEmail ? `Please email remittance advice to ${escapeHTML(b.remittanceEmail)}<br>` : ""}<span class="small">Please use the invoice number as your payment reference. Please ensure the payment reference is clearly stated on the bank transfer.</span></div>
          <div><b>Amount Owing:</b> ${money(amountOwing)}<br><b>Total Paid:</b> ${money(totalPaid)}<br>${order.dueDate ? `<b>Due Date:</b> ${escapeHTML(order.dueDate)}<br>` : ""}<b>Payment Reference:</b> ${escapeHTML(number)}</div></div></section>
        ${b.contact ? `<section class="section"><h3>Contact</h3>${escapeHTML(b.contact)}${b.phone ? ` · ${escapeHTML(b.phone)}` : ""}</section>` : ""}
        <div class="thanks">Thank you for your business.</div>
      </main>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
      <script>
        document.getElementById("downloadPdfBtn").addEventListener("click", async function() {
          const button = this;
          if (typeof html2pdf === "undefined") {
            alert("PDF 下载组件加载失败。请检查网络连接后重新打开 Invoice 页面。");
            return;
          }
          button.disabled = true;
          button.textContent = "正在生成 PDF…";
          try {
            await html2pdf().set({
              margin: [10, 10, 10, 10],
              filename: "${escapeHTML(number)}.pdf",
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
              pagebreak: { mode: ["css", "legacy"] }
            }).from(document.querySelector(".paper")).save();
          } catch (error) {
            alert("PDF 生成失败，请刷新 Invoice 页面后重试。");
          } finally {
            button.disabled = false;
            button.textContent = "↓ 下载 PDF";
          }
        });
      </script>
      </body></html>`;
    invoiceWindow.document.open(); invoiceWindow.document.write(doc); invoiceWindow.document.close();
  }

  function renderAll() {
    renderDashboard();
    renderCustomers();
    renderOrders();
    renderProjects();
    if ($("invoicesList")) renderInvoices();
  }
  function navigate(view) {
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `${view}View`));
    document.querySelectorAll(".tab, .side-link").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openCustomerForm(id = "") {
    const c = data.customers.find(x => x.id === id);
    $("customerForm").reset();
    $("customerId").value = c?.id || "";
    $("customerDialogTitle").textContent = c ? "编辑客户" : "新客户";
    $("customerName").value = c?.name || "";
    $("customerContact").value = c?.contact || "";
    $("customerPhone").value = c?.phone || "";
    $("customerEmail").value = c?.email || "";
    $("customerNotes").value = c?.notes || "";
    $("customerDialog").showModal();
  }
  function openOrderForm(id = "") {
    const o = data.orders.find(x => x.id === id);
    $("orderForm").reset();
    $("orderId").value = o?.id || "";
    $("orderDialogTitle").textContent = o ? "编辑订单" : "新订单";
    $("orderTitle").value = o?.title || "";
    $("orderCustomer").innerHTML = `<option value="">选择客户（可选）</option>` + [...data.customers].sort((a,b) => a.name.localeCompare(b.name)).map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join("");
    $("orderCustomer").value = o?.customerId || "";
    $("orderAmount").value = o?.amount ?? "";
    $("orderStatus").value = ["待处理", "已完成", "已取消"].includes(o?.status) ? o.status : "待处理";
    $("orderPaymentStatus").value = o?.paymentStatus || "unpaid";
    $("orderDate").value = o?.date || today();
    $("orderDueDate").value = o?.dueDate || "";
    $("orderNotes").value = o?.notes || "";
    renderLineEditors("orderLineItems", o?.lines || []);
    $("orderDialog").showModal();
  }
  function detailLine(label, value) {
    return `<div class="detail-line"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "—")}</strong></div>`;
  }
  function openCustomerDetail(id) {
    const c = data.customers.find(x => x.id === id);
    if (!c) return;
    detailContext = { type: "customer", id };
    $("detailEyebrow").textContent = "CUSTOMER PROFILE";
    $("detailTitle").textContent = c.name;
    if ($("convertToInvoiceBtn")) $("convertToInvoiceBtn").hidden = true;
    $("detailBody").innerHTML = detailLine("联系人", c.contact) + detailLine("电话", c.phone) + detailLine("邮箱", c.email) + detailLine("备注", c.notes) + detailLine("关联订单", String(data.orders.filter(o => o.customerId === id).length));
    $("detailEditBtn").textContent = "编辑客户";
    $("detailDialog").showModal();
  }
  function openOrderDetail(id) {
    const o = data.orders.find(x => x.id === id);
    if (!o) return;
    detailContext = { type: "order", id };
    $("detailEyebrow").textContent = "ORDER DETAILS";
    $("detailTitle").textContent = o.title;
    const lineHtml = (o.lines || []).map(l => `<div class="detail-line"><span>${escapeHTML(l.name)} · ${escapeHTML(l.qty)} ${escapeHTML(l.unit || "unit")} × ${money(l.rate)}</span><strong>${money(lineTotal(l))}</strong></div>`).join("");
    $("detailBody").innerHTML = detailLine("客户", customerName(o.customerId)) + lineHtml + detailLine("金额", money(o.amount)) + detailLine("订单状态", o.status) + detailLine("付款状态", o.paymentStatus === "paid" ? "已支付" : "待支付") + detailLine("订单日期", dateLabel(o.date)) + detailLine("交付日期", dateLabel(o.dueDate)) + detailLine("备注", o.notes);
    $("detailEditBtn").textContent = "编辑订单";
    $("detailDeleteBtn").textContent = "删除";
    let convertBtn = $("convertToInvoiceBtn");
    if (!convertBtn) {
      convertBtn = document.createElement("button"); convertBtn.type = "button"; convertBtn.id = "convertToInvoiceBtn"; convertBtn.className = "primary-button"; convertBtn.textContent = "导出 Invoice";
      $("detailDialog").querySelector(".dialog-actions").insertBefore(convertBtn, $("detailEditBtn"));
      convertBtn.addEventListener("click", () => { if (detailContext?.type === "order") { exportOrderInvoice(detailContext.id); } });
    }
    convertBtn.hidden = false;
    $("detailDialog").showModal();
  }
  $("customerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("customerId").value;
    const existing = data.customers.find(c => c.id === id);
    const customer = {
      id: id || uid("cus"),
      name: $("customerName").value.trim(),
      contact: $("customerContact").value.trim(),
      phone: $("customerPhone").value.trim(),
      email: $("customerEmail").value.trim(),
      notes: $("customerNotes").value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!customer.name) return showToast("请填写客户名称");
    if (existing) data.customers = data.customers.map(c => c.id === id ? customer : c);
    else data.customers.push(customer);
    $("customerDialog").close();
    saveData();
    showToast(existing ? "客户资料已更新" : "客户已保存");
  });
  $("orderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("orderId").value;
    const existing = data.orders.find(o => o.id === id);
    const order = {
      id: id || uid("ord"),
      title: $("orderTitle").value.trim(),
      customerId: $("orderCustomer").value,
      amount: Math.round((Number($("orderAmount").value) || 0) * 100) / 100,
      lines: readLineEditors("orderLineItems"),
      status: $("orderStatus").value,
      paymentStatus: $("orderPaymentStatus").value || "unpaid",
      date: $("orderDate").value || today(),
      dueDate: $("orderDueDate").value,
      notes: $("orderNotes").value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!order.title) return showToast("请填写订单名称");
    if (order.amount < 0) return showToast("金额不能小于 0");
    if (existing) data.orders = data.orders.map(o => o.id === id ? order : o);
    else data.orders.push(order);
    $("orderDialog").close();
    saveData();
    showToast(existing ? "订单已更新" : "订单已保存");
  });
  function renderBusinessSettings() {
    const b = data.business || {};
    $("businessName").value = b.name || "";
    $("businessAbn").value = b.abn || "";
    $("businessContact").value = b.contact || "";
    $("businessPhone").value = b.phone || "";
    $("businessAddress").value = b.address || "";
    $("businessBsb").value = b.bsb || "";
    $("businessAccount").value = b.account || "";
    $("businessAccountName").value = b.accountName || "";
    $("businessRemittanceEmail").value = b.remittanceEmail || "";
  }
  renderBusinessSettings();
  $("businessSettingsForm").addEventListener("submit", event => {
    event.preventDefault();
    data.business = {
      name: $("businessName").value.trim(),
      abn: $("businessAbn").value.trim(),
      contact: $("businessContact").value.trim(),
      phone: $("businessPhone").value.trim(),
      address: $("businessAddress").value.trim(),
      bsb: $("businessBsb").value.trim(),
      account: $("businessAccount").value.trim(),
      accountName: $("businessAccountName").value.trim(),
      remittanceEmail: $("businessRemittanceEmail").value.trim()
    };
    saveData();
    showToast("企业资料已保存");
  });

  $("projectForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("projectId").value, existing = data.projects.find(p => p.id === id);
    const p = { id: id || uid("prj"), name: $("projectName").value.trim(), unit: $("projectUnit").value.trim() || "unit",
      rate: Math.round((Number($("projectRate").value) || 0) * 100) / 100, description: $("projectDescription").value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString() };
    if (!p.name) return showToast("请填写项目名称");
    if (existing) data.projects = data.projects.map(x => x.id === id ? p : x); else data.projects.push(p);
    $("projectDialog").close(); saveData(); showToast(existing ? "项目已更新" : "项目已保存");
  });
  $("addProjectBtn").addEventListener("click", () => openProjectForm());
  $("addOrderLineBtn").addEventListener("click", () => {
    const lines = readLineEditors("orderLineItems"); lines.push({ projectId: "", qty: 1, rate: 0 });
    renderLineEditors("orderLineItems", lines);
  });
  function openSidebar() {
    $("sidebar").classList.add("open");
    $("sidebar").setAttribute("aria-hidden", "false");
    $("sidebarBackdrop").hidden = false;
    $("navToggle").setAttribute("aria-expanded", "true");
    $("navToggle").setAttribute("aria-label", "关闭侧边导航");
    $("navToggle").textContent = "×";
  }
  function closeSidebar() {
    const sidebar = $("sidebar");
    if (!sidebar) return;
    sidebar.classList.remove("open");
    sidebar.setAttribute("aria-hidden", "true");
    $("sidebarBackdrop").hidden = true;
    $("navToggle").setAttribute("aria-expanded", "false");
    $("navToggle").setAttribute("aria-label", "打开侧边导航");
    $("navToggle").textContent = "☰";
  }
  $("navToggle").addEventListener("click", () => $("sidebar").classList.contains("open") ? closeSidebar() : openSidebar());
  $("sidebarBackdrop").addEventListener("click", closeSidebar);
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
  document.querySelectorAll("[data-nav]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.nav)));
$("addCustomerBtn").addEventListener("click", () => openCustomerForm());
  $("addOrderBtn").addEventListener("click", () => openOrderForm());
  $("customerSearch").addEventListener("input", renderCustomers);
  $("orderSearch").addEventListener("input", renderOrders);
  $("orderFilters").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;
    orderFilter = btn.dataset.filter;
    renderOrders();
  });
  document.addEventListener("click", (event) => {
    const c = event.target.closest(".customer-open");
    const o = event.target.closest(".order-open");
    if (c) openCustomerDetail(c.dataset.id);
    if (o) openOrderDetail(o.dataset.id);
  });
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).close()));
  $("detailEditBtn").addEventListener("click", () => {
    if (!detailContext) return;
    $("detailDialog").close();
    if (detailContext.type === "customer") openCustomerForm(detailContext.id);
    else if (detailContext.type === "order") openOrderForm(detailContext.id);
    else if (detailContext.type === "invoice") {
      const inv = data.invoices.find(x => x.id === detailContext.id);
      if (!inv) return;
      const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escapeHTML(invoiceNumber(inv))}</title><style>body{font:14px Arial,sans-serif;max-width:800px;margin:40px auto;color:#222}h1{font-size:28px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}</style><h1>INVOICE</h1><h2>${escapeHTML(invoiceNumber(inv))}</h2><p><b>Bill to:</b> ${escapeHTML(customerName(inv.customerId))}</p><p>Invoice date: ${escapeHTML(inv.date || "")}　Due date: ${escapeHTML(inv.dueDate || "")}</p><table><thead><tr><th>项目</th><th>数量</th><th>单位</th><th>单价</th><th>金额</th></tr></thead><tbody>${(inv.lines||[]).map(l=>`<tr><td>${escapeHTML(l.name)}</td><td>${escapeHTML(l.qty)}</td><td>${escapeHTML(l.unit||"unit")}</td><td>${money(l.rate)}</td><td>${money(lineTotal(l))}</td></tr>`).join("")}</tbody></table><p>${escapeHTML(inv.notes || "")}</p><div class="total">Total: ${money(inv.total)} AUD</div><script>window.onload=()=>window.print()<\/script></html>`;
      const win = window.open("", "_blank"); if (!win) return showToast("请允许弹出窗口后重试"); win.document.write(html); win.document.close();
    }
  });
  $("detailDeleteBtn").addEventListener("click", () => {
    if (!detailContext) return;
    const isCustomer = detailContext.type === "customer";
    const isInvoice = detailContext.type === "invoice";
    const targetId = detailContext.id;
    if (isInvoice) {
      if (!confirm("确定删除这张发票吗？")) return;
      data.invoices = data.invoices.filter(i => i.id !== targetId);
    } else if (isCustomer) {
      const linkedCount = data.orders.filter(o => o.customerId === targetId).length;
      const warning = linkedCount ? `该客户关联 ${linkedCount} 笔订单。删除客户不会删除订单，但订单将显示为未关联客户。` : "此操作无法撤销。";
      if (!confirm(`确定删除该客户吗？\\n${warning}`)) return;
      data.customers = data.customers.filter(c => c.id !== targetId);
    } else {
      if (!confirm("确定删除这笔订单吗？此操作无法撤销。")) return;
      data.orders = data.orders.filter(o => o.id !== targetId);
    }
    $("detailDialog").close();
    detailContext = null;
    saveData();
    showToast(isInvoice ? "发票已删除" : isCustomer ? "客户已删除" : "订单已删除");
  });
  $("exportBtn").addEventListener("click", () => {
    const backup = { app: "Ledger Mini", schemaVersion: 1, exportedAt: new Date().toISOString(), ...data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-mini-backup-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("备份文件已导出，请妥善保管");
  });
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.orders)) throw new Error("格式不正确");
      if (!confirm(`将导入 ${parsed.customers.length} 位客户和 ${parsed.orders.length} 笔订单，并替换当前本机数据。继续吗？`)) return;
      data = {
        customers: parsed.customers.filter(x => x && typeof x.id === "string" && typeof x.name === "string"),
        orders: parsed.orders.filter(x => x && typeof x.id === "string" && typeof x.title === "string"),
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        business: parsed.business && typeof parsed.business === "object" ? parsed.business : {}
      };
      saveData();
      showToast("数据恢复成功");
    } catch (error) {
      showToast("导入失败：请选择有效的 Ledger Mini JSON 备份");
    } finally {
      event.target.value = "";
    }
  });
  $("clearDataBtn").addEventListener("click", () => {
    if (!confirm("确定清除这台设备上的所有客户和订单吗？建议先导出备份。此操作无法撤销。")) return;
    data = { customers: [], orders: [], projects: [], invoices: [] };
    saveData();
    showToast("本机数据已清除");
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
  renderAll();
})();