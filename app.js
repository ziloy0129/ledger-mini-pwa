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
        orders: Array.isArray(parsed.orders) ? parsed.orders : []
      };
    } catch {
      return { customers: [], orders: [] };
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
  function renderAll() {
    renderDashboard();
    renderCustomers();
    renderOrders();
  }
  function navigate(view) {
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `${view}View`));
    document.querySelectorAll(".tab").forEach(el => el.classList.toggle("active", el.dataset.view === view));
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
    $("orderStatus").value = o?.status || "待处理";
    $("orderDate").value = o?.date || today();
    $("orderDueDate").value = o?.dueDate || "";
    $("orderNotes").value = o?.notes || "";
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
    $("detailBody").innerHTML = detailLine("客户", customerName(o.customerId)) + detailLine("金额", money(o.amount)) + detailLine("状态", o.status) + detailLine("订单日期", dateLabel(o.date)) + detailLine("交付日期", dateLabel(o.dueDate)) + detailLine("备注", o.notes);
    $("detailEditBtn").textContent = "编辑订单";
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
      status: $("orderStatus").value,
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
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
  document.querySelectorAll("[data-nav]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.nav)));
  $("quickAdd").addEventListener("click", () => {
    const choice = window.prompt("输入 1 新增客户，或输入 2 新增订单", "2");
    if (choice === "1") openCustomerForm();
    else if (choice === "2") openOrderForm();
  });
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
    else openOrderForm(detailContext.id);
  });
  $("detailDeleteBtn").addEventListener("click", () => {
    if (!detailContext) return;
    const isCustomer = detailContext.type === "customer";
    const targetId = detailContext.id;
    if (isCustomer) {
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
    showToast(isCustomer ? "客户已删除" : "订单已删除");
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
        orders: parsed.orders.filter(x => x && typeof x.id === "string" && typeof x.title === "string")
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
    data = { customers: [], orders: [] };
    saveData();
    showToast("本机数据已清除");
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
  renderAll();
})();