// Mobile menu toggle
const burger = document.getElementById('burger');
if (burger) {
  burger.addEventListener('click', () => {
    const nav = document.querySelector('.nav-links');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });
}
// Year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Contact form submission to Cloudflare Worker route
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.textContent = 'Sending…';
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Bad response');
      note.textContent = 'Thanks! We\'ll be in touch shortly.';
      form.reset();
    } catch (err) {
      note.textContent = 'Could not send. Email us at contact@thelimbostudio.com.';
    }
  });
}