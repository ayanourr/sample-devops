(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const themeToggle = document.getElementById('themeToggle');
  const root = document.body;
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'light') root.classList.add('light');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = root.classList.toggle('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }

  // Populate features and items on homepage
  const featureList = document.getElementById('featureList');
  const itemsContainer = document.getElementById('itemsContainer');
  const itemsLoading = document.getElementById('itemsLoading');
  const itemsError = document.getElementById('itemsError');
  const filterInput = document.getElementById('filterInput');

  const renderItems = (items) => {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div>${item.technologies.map((t) => `<span class="badge">${t}</span>`).join('')}</div>
      `;
      itemsContainer.appendChild(el);
    });
  };

  const fetchData = async () => {
    if (!featureList && !itemsContainer) return;
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (featureList) {
        featureList.innerHTML = '';
        (data.app.features || []).forEach((f) => {
          const li = document.createElement('li');
          li.textContent = f;
          featureList.appendChild(li);
        });
      }
      if (itemsLoading) itemsLoading.classList.add('hidden');
      renderItems(data.items || []);

      if (filterInput) {
        filterInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase();
          const filtered = (data.items || []).filter((it) =>
            it.technologies.join(' ').toLowerCase().includes(q)
          );
          renderItems(filtered);
        });
      }
    } catch (e) {
      if (itemsLoading) itemsLoading.classList.add('hidden');
      if (itemsError) itemsError.classList.remove('hidden');
    }
  };

  fetchData();

  // Contact form submit
  const form = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!submitBtn || !formStatus) return;
      submitBtn.disabled = true;
      formStatus.textContent = 'Sending…';
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      // Basic client-side validation
      if (!payload.name || !payload.email || !payload.message) {
        formStatus.textContent = 'Please fill in all fields.';
        submitBtn.disabled = false;
        return;
      }
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Request failed');
        formStatus.textContent = 'Thanks! We will get back to you soon.';
        form.reset();
      } catch (err) {
        formStatus.textContent = 'Failed to send. Try again later.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();


