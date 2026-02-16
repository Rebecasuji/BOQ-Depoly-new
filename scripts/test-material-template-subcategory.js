// quick test: login as admin and create a material-template with subcategory
(async () => {
  try {
    const API = 'http://localhost:5000/api';
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    const loginJson = await login.json();
    const token = loginJson.token;
    console.log('got token:', !!token);

    const payload = {
      name: 'Test Subcategory Template - COPY',
      code: 'TST-SUB-002',
      category: 'Testing',
      subcategory: 'MySubCat',
      vendorCategory: 'VendorX'
    };

    const res = await fetch(`${API}/material-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => null);
    console.log('status:', res.status);
    console.log('body:', body);

    // verify via GET
    const all = await fetch(`${API}/material-templates`);
    const allJson = await all.json();
    const found = (allJson.templates || []).find(t => t.code === payload.code);
    console.log('found template in list:', !!found, found ? found.subcategory : null);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();