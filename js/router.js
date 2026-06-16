const routes = {
  login: { title: 'Login', page: 'pages/login.html', init: 'initLoginPage', public: true },
  dashboard: { title: 'Dashboard', page: 'pages/dashboard.html', init: 'initDashboardPage' },
  masters: { title: 'Masters', page: 'pages/masters.html', init: 'initMastersPage' },
  work: { title: 'Work', page: 'pages/work.html', init: 'initWorkPage' },
  accounts: { title: 'Accounts', page: 'pages/accounts.html', init: 'initAccountsPage' },
  clients: { title: 'Clients', page: 'pages/clients.html', init: 'initClientsPage' },
  parts: { title: 'Parts', page: 'pages/parts.html', init: 'initPartsPage' },
  vendors: { title: 'Vendors', page: 'pages/vendors.html', init: 'initVendorsPage' },
  machines: { title: 'Machines', page: 'pages/machines.html', init: 'initMachinesPage' },
  employees: { title: 'Employees', page: 'pages/employees.html', init: 'initEmployeesPage' },
  orders: { title: 'Orders', page: 'pages/orders.html', init: 'initOrdersPage' },
  production: { title: 'Production', page: 'pages/production.html', init: 'initProductionPage' },
  dispatch: { title: 'Dispatch', page: 'pages/dispatch.html', init: 'initDispatchPage' },
  invoices: { title: 'Invoices', page: 'pages/invoices.html', init: 'initInvoicesPage' },
  expenses: { title: 'Expenses', page: 'pages/expenses.html', init: 'initExpensesPage' },
  attendance: { title: 'Attendance', page: 'pages/attendance.html', init: 'initAttendancePage' },
  advances: { title: 'Advances', page: 'pages/advances.html', init: 'initAdvancesPage' },
  customerPayments: { title: 'Customer Payments', page: 'pages/customerPayments.html', init: 'initCustomerPaymentsPage' },
  vendorPayments: { title: 'Vendor Payments', page: 'pages/vendorPayments.html', init: 'initVendorPaymentsPage' },
  notifications: { title: 'Notifications', page: 'pages/notifications.html', init: 'initNotificationsPage' },
};

function getCurrentRoute() {
  return window.location.hash.replace('#', '') || 'dashboard';
}

async function loadHtml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.text();
}

function setActiveNavigation(routeName) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === routeName);
  });
}

async function navigateTo(routeName = getCurrentRoute()) {
  const route = routes[routeName] || routes.dashboard;
  const authenticated = isAuthenticated();

  if (!route.public && !authenticated) {
    window.location.hash = 'login';
    return;
  }

  if (route.public && authenticated) {
    window.location.hash = 'dashboard';
    return;
  }

  showLoader();
  try {
    const target = route.public ? document.getElementById('authContent') : document.getElementById('pageContent');
    target.innerHTML = await loadHtml(route.page);
    const isPublicRoute = Boolean(route.public);
    document.getElementById('authLayout').classList.toggle('hidden', !isPublicRoute);
    document.getElementById('appLayout').classList.toggle('hidden', isPublicRoute);
    document.getElementById('currentPageTitle').textContent = route.title;
    setActiveNavigation(routeName);

    if (typeof window[route.init] === 'function') {
      await window[route.init]();
    }
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoader();
  }
}

function startRouter() {
  window.addEventListener('hashchange', () => navigateTo());
  navigateTo();
}
