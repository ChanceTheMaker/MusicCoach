// SPDX-License-Identifier: GPL-3.0-only
import('./musiccoach-install.js?v=coach-usb-1').catch(error=>{
  document.getElementById('install').disabled=true;
  document.getElementById('status').textContent='MusicCoach USB tools could not load. Refresh this page and try again. '+error.message;
});
