/* Small, local SVG icon library. No package or internet connection needed. */
window.Icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checklist:
    '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 4V2h6v2M8 11l2 2 5-5M8 17h8"/>',
  users:
    '<path d="M3 21v-3a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v3M17 13a4 4 0 0 1 4 4v4"/><circle cx="9.5" cy="6" r="4"/><path d="M16 2a4 4 0 0 1 0 8"/>',
  wallet:
    '<path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M20 12h-5v5h5"/><path d="M16 14.5h.5"/>',
  shop: '<path d="M3 10 5 3h14l2 7M4 10v11h16V10M9 21v-7h6v7M3 10c0 4 4 4 4 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 4 4 4 0"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h2M13 15h2M7 18h2"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  chart: '<path d="M4 3v18h17M8 17v-6M13 17V6M18 17v-9"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  sparkles:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  shield:
    '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  logout: '<path d="M9 3H3v18h6M9 12h12m-4-4 4 4-4 4"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  leaf: '<path d="M20 3C4 1 0 15 8 19s15-3 12-16ZM5 22 17 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>',
  print: '<path d="M6 9V2h12v7M6 18H2V9h20v9h-4M6 14h12v8H6ZM17 12h1"/>',
  flower:
    '<ellipse cx="12" cy="8" rx="3.5" ry="6"/><ellipse cx="12" cy="8" rx="3.5" ry="6" transform="rotate(72 12 12)"/><ellipse cx="12" cy="8" rx="3.5" ry="6" transform="rotate(144 12 12)"/><ellipse cx="12" cy="8" rx="3.5" ry="6" transform="rotate(216 12 12)"/><ellipse cx="12" cy="8" rx="3.5" ry="6" transform="rotate(288 12 12)"/>',
};
window.icon = (name, cls = "") =>
  `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Icons[name] || Icons.heart}</svg>`;
