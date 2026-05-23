const revealTargets = document.querySelectorAll(
  ".section-heading, .card, .media-card, .code-card, .resource-card, .community-card, .hero-metrics li"
);

revealTargets.forEach((element) => {
  element.classList.add("reveal");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("reveal-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.12,
  }
);

revealTargets.forEach((element) => {
  observer.observe(element);
});
