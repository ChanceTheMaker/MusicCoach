const drawings={
  singing:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v4M8 22h8M10 6h4M10 9h4"/>',
  drums:'<ellipse cx="12" cy="7" rx="9" ry="3"/><path d="M3 7v10c0 4 18 4 18 0V7M3 16c3 4 15 4 18 0M7 10v8M12 10v10M17 10v8M2 2l11 3M22 2L12 5"/>',
  piano:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M12 4v16M17 4v16"/><path d="M6 4h2v9H6zM11 4h2v9h-2zM16 4h2v9h-2z" fill="currentColor"/>',
  guitar:'<path d="M14 9l5-6 2 2-6 6c1 2 1 4-1 5-1 1-2 0-3 2-2 4-6 5-8 2s-1-6 2-7c2-1 1-2 2-3 2-2 4-2 7-1zM18 3l2-2 3 3-2 2M6 17l3 3M10 14L20 4"/><circle cx="10" cy="14" r="2"/>',
  bass:'<path d="M13 11l6-9 3 2-7 9c2 3 0 7-3 7-1 0-1 2-4 2-5 0-7-4-4-7 2-2 4 0 4-3 0-2 3-3 5-1zM18 3l4 3M6 18l4 2M10 17l10-13M12 17l10-13"/>',
  sax:'<path d="M13 2h4l2 3-2 2-2-3-1 9c0 3-3 3-3 6 0 2 4 2 5 0l1-5 5 2-3 5c-3 4-11 3-12-2-1-4 5-6 5-9zM16 14l6 2M7 18l-3-1M8 15l-3-1M10 12l-3-1"/>',
  harmonica:'<path d="M2 8l17-3 3 3v9L5 20l-3-3zM2 8l3 3 17-3M5 11v9"/><path d="M8 12v4M11 12v4M14 11v4M17 11v4M20 10v4"/>'
};
export function instrumentIcon(instrument){
  return `<svg class="instrument-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${drawings[instrument]||''}</svg>`;
}
