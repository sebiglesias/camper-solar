(() => {
  'use strict';

  // State
  const state = {
    appliances: [
      { id: 'fridge', name: 'Heladera 12V (Compresor)', power: 45, hours: 8, checked: true, icon: '❄️' },
      { id: 'leds', name: 'Luces LED interiores', power: 15, hours: 4, checked: true, icon: '💡' },
      { id: 'pump', name: 'Bomba de agua 12V (Presurizada)', power: 40, hours: 0.5, checked: true, icon: '💧' },
      { id: 'phone', name: 'Carga de Celulares (x2 USB)', power: 20, hours: 3, checked: true, icon: '📱' },
      { id: 'laptop', name: 'Carga de Laptop / Notebook', power: 65, hours: 3, checked: true, icon: '💻' },
      { id: 'diesel', name: 'Calefactor estacionario gasoil', power: 25, hours: 6, checked: false, icon: '🔥' },
      { id: 'fan', name: 'Claraboya / Extractor MaxxFan', power: 20, hours: 5, checked: false, icon: '🌪️' },
      { id: 'starlink', name: 'Antena Starlink Mini / Roam', power: 35, hours: 4, checked: false, icon: '📡' },
      { id: 'tv', name: 'TV / Monitor 12V', power: 30, hours: 2, checked: false, icon: '📺' },
      { id: 'inverter', name: 'Inversor 220V (Cargas varias)', power: 120, hours: 1, checked: false, icon: '🔌' }
    ],
    batteryType: 'lifepo4', // 'lifepo4' (80% DOD) | 'agm' (50% DOD)
    autonomyDays: 2,
    sunHours: 5.0 // HSP horas de sol pico
  };

  // DOM Elements
  const appliancesListEl = document.getElementById('appliancesList');
  const selectBatteryType = document.getElementById('selectBatteryType');
  const selectAutonomy = document.getElementById('selectAutonomy');
  const selectSunHours = document.getElementById('selectSunHours');
  const themeToggle = document.getElementById('themeToggle');
  const toast = document.getElementById('toast');

  // Metrics Display
  const heroDailyWh = document.getElementById('heroDailyWh');
  const heroDailyAh = document.getElementById('heroDailyAh');
  const specBatteryAh = document.getElementById('specBatteryAh');
  const specBatteryDesc = document.getElementById('specBatteryDesc');
  const specSolarWatts = document.getElementById('specSolarWatts');
  const specSolarDesc = document.getElementById('specSolarDesc');
  const specMpptAmps = document.getElementById('specMpptAmps');
  const specMpptDesc = document.getElementById('specMpptDesc');
  const specInverterWatts = document.getElementById('specInverterWatts');
  const specWiringGauge = document.getElementById('specWiringGauge');

  // Mobile Sticky Bar
  const stickyDailyAh = document.getElementById('stickyDailyAh');
  const stickyBatteryAh = document.getElementById('stickyBatteryAh');
  const stickyBtnShare = document.getElementById('stickyBtnShare');

  // Presets
  const PRESETS = {
    weekend: {
      batteryType: 'agm',
      autonomyDays: 1,
      sunHours: 5.0,
      loads: { fridge: 6, leds: 3, pump: 0.3, phone: 2, laptop: 0, diesel: 0, fan: 0, starlink: 0, tv: 0, inverter: 0 }
    },
    traveler: {
      batteryType: 'lifepo4',
      autonomyDays: 2,
      sunHours: 5.0,
      loads: { fridge: 8, leds: 4, pump: 0.5, phone: 3, laptop: 2, diesel: 0, fan: 4, starlink: 0, tv: 0, inverter: 1 }
    },
    nomad: {
      batteryType: 'lifepo4',
      autonomyDays: 2,
      sunHours: 5.0,
      loads: { fridge: 10, leds: 5, pump: 0.5, phone: 4, laptop: 6, diesel: 6, fan: 6, starlink: 6, tv: 0, inverter: 2 }
    }
  };

  function init() {
    loadTheme();
    renderAppliances();
    attachEvents();
    recalculate();
  }

  function renderAppliances() {
    appliancesListEl.innerHTML = state.appliances.map((app, idx) => `
      <div class="appliance-item ${app.checked ? 'active' : ''}" data-id="${app.id}">
        <div class="appliance-header">
          <label class="appliance-check-label">
            <input type="checkbox" class="app-check" data-idx="${idx}" ${app.checked ? 'checked' : ''}>
            <span>${app.icon} ${app.name}</span>
          </label>
          <span class="appliance-power">${app.power} W</span>
        </div>
        <div class="appliance-controls" style="${app.checked ? '' : 'opacity: 0.4; pointer-events: none;'}">
          <input type="range" class="appliance-slider" data-idx="${idx}" min="0.5" max="24" step="0.5" value="${app.hours}">
          <span class="appliance-hours-val">${app.hours} hs/día</span>
          <span class="appliance-subtotal">${Math.round(app.power * app.hours)} Wh</span>
        </div>
      </div>
    `).join('');
  }

  function attachEvents() {
    // Appliance checkboxes & sliders
    appliancesListEl.addEventListener('change', (e) => {
      if (e.target.classList.contains('app-check')) {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.appliances[idx].checked = e.target.checked;
        renderAppliances();
        recalculate();
      }
    });

    appliancesListEl.addEventListener('input', (e) => {
      if (e.target.classList.contains('appliance-slider')) {
        const idx = parseInt(e.target.dataset.idx, 10);
        const hours = parseFloat(e.target.value);
        state.appliances[idx].hours = hours;
        const itemEl = e.target.closest('.appliance-item');
        itemEl.querySelector('.appliance-hours-val').textContent = `${hours} hs/día`;
        itemEl.querySelector('.appliance-subtotal').textContent = `${Math.round(state.appliances[idx].power * hours)} Wh`;
        recalculate();
      }
    });

    // Selects
    selectBatteryType.addEventListener('change', (e) => {
      state.batteryType = e.target.value;
      recalculate();
    });
    selectAutonomy.addEventListener('change', (e) => {
      state.autonomyDays = parseFloat(e.target.value);
      recalculate();
    });
    selectSunHours.addEventListener('change', (e) => {
      state.sunHours = parseFloat(e.target.value);
      recalculate();
    });

    // Preset Chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const presetKey = chip.dataset.preset;
        const p = PRESETS[presetKey];
        if (!p) return;

        state.batteryType = p.batteryType;
        state.autonomyDays = p.autonomyDays;
        state.sunHours = p.sunHours;

        selectBatteryType.value = p.batteryType;
        selectAutonomy.value = p.autonomyDays;
        selectSunHours.value = p.sunHours;

        state.appliances.forEach(app => {
          if (p.loads.hasOwnProperty(app.id)) {
            const h = p.loads[app.id];
            app.checked = h > 0;
            app.hours = h > 0 ? h : (app.id === 'pump' ? 0.5 : 2);
          }
        });

        renderAppliances();
        recalculate();
        showToast(`🚐 Preset aplicado: ${chip.textContent.trim()}`);
      });
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Actions
    document.getElementById('btnShareWhatsApp').addEventListener('click', shareTechnicalSheet);
    document.getElementById('btnPrintReport').addEventListener('click', () => window.print());
    stickyBtnShare.addEventListener('click', shareTechnicalSheet);

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        item.classList.toggle('active');
      });
    });
  }

  // Core Sizing Calculation
  function calculateSizing() {
    let totalWh = 0;
    let peakPowerWatts = 0;

    state.appliances.forEach(app => {
      if (app.checked) {
        totalWh += (app.power * app.hours);
        peakPowerWatts += app.power;
      }
    });

    totalWh = Math.max(10, totalWh);
    const dailyAh = totalWh / 12; // 12V basis

    // Battery Bank sizing
    // LiFePO4: 80% usable capacity (0.80 DOD)
    // AGM / Gel: 50% usable capacity (0.50 DOD)
    const dod = state.batteryType === 'lifepo4' ? 0.80 : 0.50;
    const rawBatteryAh = (dailyAh * state.autonomyDays) / dod;

    // Round to standard commercial capacity (e.g. 50, 100, 150, 200, 250, 300, 400)
    let commercialBatteryAh = Math.ceil(rawBatteryAh / 25) * 25;
    if (commercialBatteryAh < 50) commercialBatteryAh = 50;

    // Solar Panel sizing
    // Daily replenishment needed + 25% system loss (flat mounting on roof, angle, dust, MPPT efficiency)
    const dailyReplenishWh = totalWh * 1.25;
    const requiredSolarWp = Math.ceil(dailyReplenishWh / state.sunHours);
    
    // Round to standard panel sizes (e.g., 100W, 160W, 200W, 350W, 400W, 450W)
    let recommendedPanelsText = '';
    let commercialSolarWp = Math.ceil(requiredSolarWp / 50) * 50;
    if (commercialSolarWp <= 160) {
      recommendedPanelsText = '1 panel de 160W';
    } else if (commercialSolarWp <= 200) {
      recommendedPanelsText = '1 panel de 200W o 2 de 100W';
    } else if (commercialSolarWp <= 350) {
      recommendedPanelsText = '1 panel de 350W o 2 de 160W';
    } else if (commercialSolarWp <= 450) {
      recommendedPanelsText = '1 panel de 450W o 2 de 200W';
    } else {
      recommendedPanelsText = `2 paneles de ${Math.ceil(commercialSolarWp / 200) * 100}W`;
    }

    // MPPT Charge Controller sizing
    // Current = Solar Watts / 12V + 20% safety margin
    const mpptAmpsRaw = (commercialSolarWp / 12) * 1.20;
    let mpptRating = 15;
    if (mpptAmpsRaw > 40) mpptRating = 50;
    else if (mpptAmpsRaw > 30) mpptRating = 40;
    else if (mpptAmpsRaw > 20) mpptRating = 30;
    else if (mpptAmpsRaw > 15) mpptRating = 20;

    // Inverter sizing
    let inverterWatts = 500;
    if (peakPowerWatts > 1200) inverterWatts = 2000;
    else if (peakPowerWatts > 800) inverterWatts = 1500;
    else if (peakPowerWatts > 350) inverterWatts = 1000;

    // Cable & Fuse Recommendation
    let cableGauge = '16 mm² (Fusible 80A)';
    if (inverterWatts >= 2000 || commercialBatteryAh >= 300) {
      cableGauge = '35 mm² (Fusible 200A)';
    } else if (inverterWatts >= 1000 || commercialBatteryAh >= 150) {
      cableGauge = '25 mm² (Fusible 125A)';
    }

    return {
      dailyWh: Math.round(totalWh),
      dailyAh: parseFloat(dailyAh.toFixed(1)),
      batteryAh: commercialBatteryAh,
      batteryTypeLabel: state.batteryType === 'lifepo4' ? 'Litio LiFePO4' : 'AGM / Gel Ciclo Profundo',
      solarWp: commercialSolarWp,
      solarPanelsConfig: recommendedPanelsText,
      mpptRating,
      inverterWatts,
      cableGauge
    };
  }

  function recalculate() {
    const data = calculateSizing();

    heroDailyWh.textContent = `${data.dailyWh} Wh`;
    heroDailyAh.textContent = `${data.dailyAh} Ah`;

    specBatteryAh.textContent = `${data.batteryAh} Ah (12V)`;
    specBatteryDesc.textContent = `${data.batteryTypeLabel} · ${state.autonomyDays} día(s) de autonomía`;

    specSolarWatts.textContent = `${data.solarWp} Wp`;
    specSolarDesc.textContent = `${data.solarPanelsConfig} · Para ${state.sunHours} HSP sol`;

    specMpptAmps.textContent = `${data.mpptRating}A`;
    specMpptDesc.textContent = `Regulador MPPT 12V/24V (Protección sobredimensionada)`;

    specInverterWatts.textContent = `${data.inverterWatts} W`;
    specWiringGauge.textContent = data.cableGauge;

    // Update Mobile Sticky Bar
    stickyDailyAh.textContent = `${data.dailyAh} Ah/día`;
    stickyBatteryAh.textContent = `${data.batteryAh} Ah`;

    // Update Dynamic High-Ticket Amazon Associates Links
    const amzBatLink = document.getElementById('amz-battery-link');
    const amzBatLbl = document.getElementById('amz-battery-label');
    if (amzBatLink && amzBatLbl) {
      const targetAh = data.batteryAh >= 200 ? 200 : 100;
      const chem = state.batteryType === 'lifepo4' ? 'LiFePO4+lithium' : 'AGM+deep+cycle';
      amzBatLink.href = `https://www.amazon.com/s?k=12V+${targetAh}Ah+${chem}+battery+RV+camper&tag=sebiglesias-20`;
      amzBatLbl.textContent = `Batería 12V ${data.batteryAh}Ah ${data.batteryTypeLabel} (LiTime / Renogy)`;
    }
    const amzSolLink = document.getElementById('amz-solar-link');
    const amzSolLbl = document.getElementById('amz-solar-label');
    if (amzSolLink && amzSolLbl) {
      const targetW = data.solarWp >= 350 ? 400 : 200;
      amzSolLink.href = `https://www.amazon.com/s?k=Renogy+${targetW}W+12V+monocrystalline+solar+panel+kit+RV&tag=sebiglesias-20`;
      amzSolLbl.textContent = `Kit Solar ${data.solarWp}W Monocristalino 12V (${data.solarPanelsConfig})`;
    }
    const amzMpptLink = document.getElementById('amz-mppt-link');
    const amzMpptLbl = document.getElementById('amz-mppt-label');
    if (amzMpptLink && amzMpptLbl) {
      amzMpptLink.href = `https://www.amazon.com/s?k=Victron+SmartSolar+MPPT+${data.mpptRating}A+12V+charge+controller+${data.inverterWatts}W+pure+sine+inverter&tag=sebiglesias-20`;
      amzMpptLbl.textContent = `Regulador MPPT ${data.mpptRating}A + Inversor Onda Pura ${data.inverterWatts}W`;
    }
  }

  // Share Technical Sheet
  function shareTechnicalSheet() {
    const data = calculateSizing();
    const checkedList = state.appliances
      .filter(a => a.checked)
      .map(a => `• ${a.icon} ${a.name}: ${a.power}W x ${a.hours}hs = ${Math.round(a.power * a.hours)}Wh`)
      .join('\n');

    const text = `🚐 *FICHA TÉCNICA INSTALACIÓN SOLAR 12V*
⚡ *Consumo Diario:* ${data.dailyWh} Wh/día (${data.dailyAh} Ah a 12V)

*Aparatos conectados:*
${checkedList}

🔋 *Banco de Baterías:* ${data.batteryAh} Ah (${data.batteryTypeLabel})
☀️ *Paneles Solares:* ${data.solarWp} Wp (${data.solarPanelsConfig})
🎛️ *Regulador de Carga:* MPPT ${data.mpptRating}A
🔌 *Inversor 220V sugerido:* ${data.inverterWatts}W Onda Pura
🛡️ *Cableado Principal:* ${data.cableGauge}

Calculado con: https://sebiglesias.com.ar/camper-solar/`;

    if (navigator.share) {
      navigator.share({
        title: 'Ficha Técnica Solar 12V Camper',
        text: text,
        url: 'https://sebiglesias.com.ar/camper-solar/'
      }).catch(() => copyToClipboard(text));
    } else {
      copyToClipboard(text);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ ¡Ficha técnica copiada al portapapeles!');
    }).catch(() => {
      showToast('❌ Error al copiar');
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('camper_theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  }

  function loadTheme() {
    const saved = localStorage.getItem('camper_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // Multilingual i18n Engine (?lang=es|en|de|fr|it|pt|nl|sv|da|pl)
  const I18N_SOLAR = {
    es: { title: 'Calculadora Solar Camper <span class="brand-badge">12V / 24V</span>', loads: '⚡ Consumos Eléctricos Diarios', specs: '📋 Ficha Técnica Recomendada' },
    en: { title: 'RV & Vanlife Solar Calculator <span class="brand-badge">12V / LiFePO4</span>', loads: '⚡ Daily 12V & AC Power Loads', specs: '📋 Recommended Solar & Battery Sizing' },
    de: { title: 'Wohnmobil Solaranlage Rechner <span class="brand-badge">12V / LiFePO4</span>', loads: '⚡ Täglicher Stromverbrauch im Camper', specs: '📋 Empfohlene Batterie- & Solar-Dimensionierung' },
    fr: { title: 'Calculateur Solaire Camping-Car <span class="brand-badge">12V / LiFePO4</span>', loads: '⚡ Consommation Électrique Quotidienne', specs: '📋 Dimensionnement Batterie & Panneaux Solaires' },
    it: { title: 'Calcolatore Impianto Solare Camper <span class="brand-badge">12V / Litio</span>', loads: '⚡ Consumi Elettrici Giornalieri 12V', specs: '📋 Dimensionamento Batteria LiFePO4 e Pannelli' },
    pt: { title: 'Calculadora Solar Motorhome & Van <span class="brand-badge">12V / Lítio</span>', loads: '⚡ Consumo Elétrico Diário 12V', specs: '📋 Dimensionamento de Bateria e Painéis Solares' },
    nl: { title: 'Camper Zonnepanelen & Accu Calculator <span class="brand-badge">12V / LiFePO4</span>', loads: '⚡ Dagelijks Stroomverbruik in Camper', specs: '📋 Aanbevolen LiFePO4 Accu & MPPT Advies' },
    sv: { title: 'Solcellskalkylator Husbil & Camper <span class="brand-badge">12V / LiFePO4</span>', loads: '⚡ Daglig Elförbrukning 12V', specs: '📋 Rekommenderad Batteribank & Solpaneler' },
    da: { title: 'Autocamper Solcelle & Batteri Beregner <span class="brand-badge">12V</span>', loads: '⚡ Dagligt Strømforbrug i Camper', specs: '📋 Anbefalet LiFePO4 Batteri & Solceller' },
    pl: { title: 'Kalkulator Solarny Kampera 12V <span class="brand-badge">LiFePO4</span>', loads: '⚡ Dzienne Zużycie Prądu w Kamperze', specs: '📋 Dobór Akumulatora LiFePO4 i Paneli' }
  };

  function setupI18n() {
    const sel = document.getElementById('lang-select');
    const titleEl = document.querySelector('.brand-title');
    const loadsEl = document.getElementById('loadsTitle');
    const specsEl = document.getElementById('specsTitle');
    function apply(lang) {
      const d = I18N_SOLAR[lang] || I18N_SOLAR.es;
      document.documentElement.lang = lang;
      if (titleEl) titleEl.innerHTML = d.title;
      if (loadsEl) loadsEl.textContent = d.loads;
      if (specsEl) specsEl.textContent = d.specs;
    }
    const params = new URLSearchParams(window.location.search);
    const initLang = params.get('lang') || localStorage.getItem('camper-lang') || 'es';
    const valid = I18N_SOLAR[initLang] ? initLang : 'es';
    if (sel) {
      sel.value = valid;
      sel.addEventListener('change', (e) => {
        const nl = e.target.value;
        localStorage.setItem('camper-lang', nl);
        const u = new URL(window.location.href);
        if (nl === 'es') u.searchParams.delete('lang');
        else u.searchParams.set('lang', nl);
        window.history.replaceState({}, '', u);
        apply(nl);
      });
    }
    apply(valid);
  }

  document.addEventListener('DOMContentLoaded', () => { init(); setupI18n(); });
})();
