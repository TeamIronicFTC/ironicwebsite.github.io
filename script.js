// TEAM IRONIC WEBSITE SCRIPT
//
// Does four things, all run on every page:
//   1. Countdown card: updates the "days to go" number on the home
//      page (does nothing on pages without a countdown card)
//   2. Active nav link: adds the ".active" highlight to whichever
//      nav link matches the current page
//   3. History locator scrollspy: highlights whichever season is
//      currently on screen on the history page (does nothing on
//      pages without a .history-locator)
//   4. Newsletter modal: turns any "Newsletter" link/button into a
//      blurred overlay popup instead of a page navigation (does
//      nothing on pages with no such link)


// ----------------------------------------------------------
// 1. Countdown to next competition
// ----------------------------------------------------------
// To update, change NEXT_COMP_DATE below to the next event's date
// and time (format: "YYYY-MM-DDTHH:MM:SS", 24 hour clock). Also
// update the matching text in the .countdown-event line in
// index.html so the label and the countdown match up.
//
// Card only shows whole days now (hours/min/sec got dropped), so it
// only needs to recheck once a minute, not once a second.
const NEXT_COMP_DATE = "2026-09-12T08:00:00"; // Kick Off Event, Charlotte HS

function updateCountdown() {
  const daysEl = document.getElementById('cd-days');
  if (!daysEl) return; // this page has no countdown card, nothing to update
  if (!NEXT_COMP_DATE) return; // leave dashes showing

  const target = new Date(NEXT_COMP_DATE).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    daysEl.textContent = '0';
    return;
  }

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  daysEl.textContent = String(days);
}

updateCountdown();
setInterval(updateCountdown, 60 * 1000);


// ----------------------------------------------------------
// 2. Active nav link
// ----------------------------------------------------------
// Each HTML file's <body> tag passes its own filename through a
// data attribute, like <body data-page="team.html">. This just
// checks that against each nav link's href and marks the match
// ".active", no server or routing needed for it to work.
document.addEventListener('DOMContentLoaded', () => {
  const current = document.body.getAttribute('data-page');
  if (!current) return;
  document.querySelectorAll('.nav-link').forEach(el => {
    const href = el.getAttribute('href');
    if (href === current) el.classList.add('active');
  });
});


// ----------------------------------------------------------
// 3. History page: season locator scrollspy
// ----------------------------------------------------------
// Watches every .season-block on the history page and marks the
// matching .locator-link ".active" whenever that season is the one
// in view, so the left-hand tab column tracks scroll position
// automatically. New season blocks pick this up for free as long
// as the block's id matches its locator-link's href.
document.addEventListener('DOMContentLoaded', () => {
  const seasonBlocks = document.querySelectorAll('.season-block[id]');
  if (!seasonBlocks.length) return; // not the history page, nothing to do

  const locatorLinks = document.querySelectorAll('.history-locator .locator-link');
  const linkFor = id => Array.from(locatorLinks).find(a => a.getAttribute('href') === `#${id}`);

  const setActive = id => {
    locatorLinks.forEach(a => a.classList.remove('active'));
    const match = linkFor(id);
    if (match) match.classList.add('active');
  };

  // Start on whichever season is nearest the top of the viewport.
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    setActive(visible[0].target.id);
  }, { rootMargin: '-96px 0px -60% 0px', threshold: 0 });

  seasonBlocks.forEach(block => observer.observe(block));
  setActive(seasonBlocks[0].id); // sensible default before any scrolling happens
});


// ----------------------------------------------------------
// 4. Newsletter modal
// ----------------------------------------------------------
// Any element with [data-modal="newsletter"], plus any plain link
// pointing at newsletter.html, opens the newsletter signup as a
// blurred overlay on top of the CURRENT page instead of navigating
// away to a separate one. The overlay markup is built once per page
// (only if something on that page actually opens it) and reuses the
// exact ".newsletter-card" styling from style.css section 18, so it
// looks identical to the standalone newsletter.html page.
//
// To make something else open the newsletter this way, just give it
// data-modal="newsletter" — no other wiring needed.
document.addEventListener('DOMContentLoaded', () => {
  const triggers = document.querySelectorAll('[data-modal="newsletter"], a[href="newsletter.html"]');
  if (!triggers.length) return; // nothing on this page opens the newsletter

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'newsletterModal';
  overlay.innerHTML = `
    <div class="newsletter-card" role="dialog" aria-modal="true" aria-label="Newsletter signup">
      <button type="button" class="modal-close" aria-label="Close">&times;</button>
      <h1 class="newsletter-title type-caption-heading">Sign Up for Our Newsletter!</h1>
      <hr class="newsletter-hr">
      <p class="newsletter-text">Enter your email to receive Team IRONIC's monthly newsletter!</p>
      <form novalidate>
        <input type="email" name="email" placeholder="Email" required>
        <button type="submit" class="type-button newsletter-submit">Sign up!</button>
      </form>
      <p class="newsletter-feedback" role="status" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('form');
  const feedback = overlay.querySelector('.newsletter-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  const FORM_ENDPOINT = 'https://formspree.io/f/xbgjzrgd'; // keep in sync with newsletter.html

  const openModal = () => {
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  };
  const closeModal = () => {
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  };

  triggers.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault(); // stop <a href="newsletter.html"> from navigating
      openModal();
    });
  });

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);

  // Click on the blurred backdrop itself (not the card) closes it.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });

  // Submit over AJAX so signing up doesn't blow away the overlay by
  // navigating the whole page off to Formspree's own success page —
  // the point of a modal is that you never leave the page behind it.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.textContent = '';
    feedback.classList.remove('is-error');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Request failed');
      form.reset();
      feedback.textContent = "You're signed up! Check your inbox.";
    } catch (err) {
      feedback.textContent = 'Something went wrong — please try again.';
      feedback.classList.add('is-error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign up!';
    }
  });
});
