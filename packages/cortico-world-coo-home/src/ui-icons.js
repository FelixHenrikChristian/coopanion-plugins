const paths={
  home:'M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7',
  chat:'M20 15a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3ZM7 8h9M7 12h6',
  focus:'M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  moon:'M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z',
  bowl:'M3 11h18a9 9 0 0 1-18 0Zm4 9h10M8 3v4m4-5v5m4-4v4',
  drop:'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM9 16a3 3 0 0 0 3 3',
  heart:'m12 20-8-8C-1 5 8 1 12 7c4-6 13-2 8 5Z',
  leaf:'M12 21V10M12 15C4 15 3 10 3 6c6 0 9 3 9 9ZM12 10c0-6 4-8 9-8 0 5-3 8-9 8',
  clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  harvest:'m3 10 3 10h12l3-10ZM7 10l5-7 5 7M9 13v4m6-4v4',
  send:'m3 3 18 9-18 9 4-9Zm4 9h14',
  close:'m6 6 12 12M18 6 6 18',
  pause:'M9 5v14M15 5v14',
  play:'m8 4 12 8-12 8Z',
};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]??paths.leaf}"/></svg>`;}
