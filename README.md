# Ledger Mini PWA

A free, offline-first customer and order manager designed for iPhone Safari. Pure HTML, CSS and JavaScript; no framework, paid API, server or cloud database.

## Features
- Dashboard with total order value, customer count and open orders
- Customer CRUD: name, contact, phone, email, notes
- Order CRUD: title, customer, AUD amount, status, order/due dates, notes
- Search and status filters
- Local browser storage
- JSON export/import backup
- PWA manifest and service worker for offline app shell
- Responsive iPhone-first interface

## Run locally
For PWA/service worker testing, serve over localhost (opening index.html directly does not enable service workers).

If Python 3 is installed:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in a browser.

## Free deployment using GitHub Pages
1. Sign in or create a free GitHub account.
2. Create a new **public** repository, for example `ledger-mini-pwa`.
3. Upload all files and the `icons` folder from this project to the repository root.
4. Open repository **Settings → Pages**.
5. Under Build and deployment, choose **Deploy from a branch**.
6. Select branch `main`, folder `/(root)`, and save.
7. Wait for the published URL, typically `https://YOUR-USERNAME.github.io/ledger-mini-pwa/`.
8. Open that HTTPS URL in Safari on iPhone.
9. Tap Share → Add to Home Screen → Add.
10. Open the new home-screen icon. Add one test customer and order, close/reopen the app, then export a JSON backup.

GitHub Pages is static hosting. The repository's app code is public if the repository is public, but customer/order records are not uploaded by this app; they remain in browser storage. Do not put customer records or backup files into the repository.

## Important local-data behaviour
- Data is stored in localStorage for the current origin/browser profile.
- It does not sync between devices or automatically share records with friends.
- Clearing Safari website data can erase records. Export JSON backups regularly.
- A JSON backup contains customer personal information; protect it like a business document.
- This MVP does not encrypt local records, provide login/access control, audit logs, or multi-user collaboration. Do not use it as the only system of record for sensitive or regulated business data.
- If the deployed URL/path changes, the browser may treat it as a different origin and old data may not appear.

## Update the app
1. Edit files and upload the new version to the same repository.
2. Update `CACHE_NAME` in `service-worker.js` (e.g. `ledger-mini-v2`) so the new app shell is cached.
3. Wait for GitHub Pages to deploy; close and reopen the installed PWA, and refresh if needed.

## Customization
- App name and metadata: `index.html`, `manifest.webmanifest`
- UI: `styles.css`
- Features/data model: `app.js`
- Offline cache: `service-worker.js`


## 新增：收费项目与发票
- 在“项目”中维护项目名称、单位和 AUD 单价。
- 创建订单时可添加收费项目，按数量和单价计算订单金额。
- 在订单详情点击“生成发票”，可从订单项目创建发票，也可在“发票”中独立创建。
- 发票可选择客户、日期、到期日、项目和数量；点击发票详情中的“打印 / 保存 PDF”，可打印或另存为 PDF。
- 发票默认不计算 GST；如需 GST，请确认适用税务规则后再自行注明或升级税务字段。


## 稳定性整理
- 移除了不再显示的独立发票页面的残留事件绑定，避免找不到页面元素时 JavaScript 初始化中断。
- 订单详情中的“导出 Invoice”保留为唯一开票入口。
- 侧边栏菜单点击逻辑与遮罩层保持独立，更新 Service Worker 缓存版本以便客户端加载新代码。


## Invoice 格式更新
- 发票采用正式 Tax Invoice 风格：供应商信息、ABN、客户信息、Invoice Number、Invoice Date、Due Date、Service Details、Qty、Rate、GST、Total、Invoice Subtotal、GST Included、Amount Owing、Payment Options。
- 设置页面新增 BSB、银行账号、账户名称和收款通知邮箱字段。
- Invoice 页面提供返回订单按钮及打印/保存 PDF 按钮。
- PDF 下载由浏览器打印功能完成；在打印对话框选择 Save as PDF。


## 订单体验改进
- 移除顶部 Quick Add 按钮。
- 必填字段星号显示在标签文字右侧。
- 订单状态移除“处理中”。
- 新增付款状态“待支付 / 已支付”。订单标记已支付后，导出 Invoice 会将 Total Paid 设为发票总额、Amount Owing 设为 $0.00；待支付时 Total Paid 为 $0.00，Amount Owing 为总额。


## 项目列表与订单项目说明
- 项目列表采用独立的价格/说明/操作布局，长说明会换行显示，编辑和删除按钮移到下方（手机端）避免重叠。
- 创建或编辑订单时，每条收费项目可以填写可选的项目说明/Description；保存到订单后会在导出的 Invoice 的 Service Details 下显示。
