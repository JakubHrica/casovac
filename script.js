// ==============================================================================
// KONFIGURÁCIA
// ==============================================================================

// Nastavenie globálneho meškania pre celý rozvrh
const DELAY_MINUTES = 0; // <--- NASTAV TU MEŠKANIE V MINÚTACH

// ==============================================================================
// Elementy a premenné
// ==============================================================================
const blockNameElement = document.getElementById('current-block-name');
const timerElement = document.getElementById('simple-timer');
const delayDisplayElement = document.getElementById('delay-display');
const skipButton = document.getElementById('skip-button'); 

let schedule = [];
let intervalId;
// Globálny index aktuálneho bloku. -1 znamená pred prvým blokom.
let currentBlockIndex = -1; 

// ---------------------------------------------------------------------------------
// FUNKCIE PRE ZOBRAZENIE ČASU A MEŠKANIA
// ---------------------------------------------------------------------------------

/**
 * Formátuje milisekundy na reťazec HH:MM s možnosťou záporného znamienka (-HH:MM).
 * @param {number} ms - Milisekundy zostávajúceho času.
 */
function formatTimeHHMM(ms) {
    let sign = '';
    let totalMs = ms;

    if (ms < 0) {
        sign = '-'; 
        totalMs = Math.abs(ms); 
    }

    const totalMinutes = Math.floor(totalMs / (1000 * 60)); 
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const pad = (num) => String(num).padStart(2, '0');
    
    const currH = pad(hours);
    const currM = pad(minutes);

    return `${sign}${currH}<span class="separator">:</span>${currM}`;
}

function updateDelayMessage() {
    if (DELAY_MINUTES === 0) {
        delayDisplayElement.textContent = "Rozvrh beží podľa plánu";
    } else if (DELAY_MINUTES > 0) {
        delayDisplayElement.textContent = `Meškanie: +${DELAY_MINUTES} min`;
    } else {
        const absDelay = Math.abs(DELAY_MINUTES);
        delayDisplayElement.textContent = `Náskok: ${absDelay} min`;
    }
}

// ---------------------------------------------------------------------------------
// FUNKCIA PRE MANUÁLNE PRESKOČENIE
// ---------------------------------------------------------------------------------

function skipToNextBlock() {
    // Ak nie sme na poslednom bloku, posunieme index a re-run
    if (currentBlockIndex < schedule.length - 1) {
        currentBlockIndex++; 
        updateBlockAndTimer(); 
    }
    // Skryjeme tlačidlo
    skipButton.classList.add('hidden');
    skipButton.classList.remove('visible');
}

skipButton.addEventListener('click', skipToNextBlock);


// ---------------------------------------------------------------------------------
// HLAVNÁ LOGIKA ROZVRHU
// ---------------------------------------------------------------------------------

/**
 * Zistí, ktorý blok by mal bežať alebo by mal nasledovať pri načítaní stránky.
 * Táto funkcia zabezpečuje, že sa NEZAČNE s blokom, ktorý skončil pred dlhou dobou.
 */
function findInitialBlockIndex() {
    let now = new Date();
    const delayMs = DELAY_MINUTES * 60 * 1000;
    // Vypočítame "efektívny čas" (kde by sme boli, keby kurz meškal)
    now = new Date(now.getTime() - delayMs); 
    
    const blocksWithDates = schedule.map(block => ({
        ...block,
        startDate: new Date(block.start),
        endDate: new Date(block.end) // Pridáme koncový čas pre kontrolu
    }));
    
    // Nájde POSLEDNÝ blok, ktorého začiatok sme už prešli
    let index = blocksWithDates.findLastIndex(block => now >= block.startDate);

    if (index === -1) {
        // Sme pred prvým blokom
        currentBlockIndex = -1;
        return;
    }
    
    // AUTOMATICKÉ PREPÍNENIE PRI NAČÍTANÍ STRÁNKY:
    // Posúvame sa dopredu z indexu nájdeného pri štarte, pokiaľ je daný blok už dávno skončený.
    while (index < blocksWithDates.length - 1 && now >= blocksWithDates[index].endDate) {
        // Blok na 'index' už skončil (efektívny čas je za jeho koncom). 
        // Posunieme sa automaticky na ďalší blok, aby sme zobrazili aktuálny rozvrh.
        index++;
    }
    
    currentBlockIndex = index;
}


function updateBlockAndTimer() {
    let now = new Date();

    // Aplikujeme meškanie na aktuálny čas
    const delayMs = DELAY_MINUTES * 60 * 1000;
    now = new Date(now.getTime() - delayMs); 

    const blocks = schedule.map(block => ({
        ...block,
        startDate: new Date(block.start),
        endDate: new Date(block.end)
    }));
    
    let timeToDisplayMs = 0;
    let blockName = "MIMO ROZVRHU"; 
    let courseEnded = false;
    
    // Predvolené skrytie tlačidla
    skipButton.classList.add('hidden');
    skipButton.classList.remove('visible');


    if (currentBlockIndex === -1 && blocks.length > 0) {
        // STAV 1: Sme pred začiatkom prvého bloku
        const firstBlock = blocks[0];
        timeToDisplayMs = firstBlock.startDate - now;
        blockName = "Nasleduje: " + firstBlock.name;
        
        // Pri štarte sme už mali index nastavený. Kontrolujeme len ak by sa čas posunul.
        if (now >= firstBlock.startDate) {
            currentBlockIndex = 0;
            return updateBlockAndTimer(); // Re-run s novým indexom
        }

    } else if (currentBlockIndex >= 0 && currentBlockIndex < blocks.length) {
        // STAV 2: Sme na aktuálne sledovanom bloku
        const currentBlock = blocks[currentBlockIndex];
        
        // Čas do konca tohto bloku (môže byť negatívny - mód meškania)
        timeToDisplayMs = currentBlock.endDate - now;
        blockName = currentBlock.name;
        
        // KONTROLA PRE AUTOMATICKÉ UKONČENIE KURZU
        // Ak je čas záporný a sme na POSLEDNOM bloku, už sa nemá kam posunúť a kurz skončil.
        if (timeToDisplayMs <= 0 && currentBlockIndex === blocks.length - 1) {
            blockName = "KURZ SKONČIL";
            timeToDisplayMs = 0;
            courseEnded = true;
        }

        // KONTROLA PRE ZOBRAZENIE TLAČIDLA (MÓD MEŠKANIA)
        // Ak je čas záporný A nie sme na poslednom bloku, zobrazíme tlačidlo a vstúpime do manuálneho módu.
        if (timeToDisplayMs < 0 && currentBlockIndex < blocks.length - 1) {
            skipButton.classList.add('visible');
            skipButton.classList.remove('hidden');
        }
        
    } else {
        // STAV 3: Kurz skončil (index je mimo rozsahu)
        blockName = "KURZ SKONČIL";
        timeToDisplayMs = 0;
        courseEnded = true;
    }
    
    // Aktualizácia DOM
    blockNameElement.textContent = blockName;
    timerElement.innerHTML = formatTimeHHMM(timeToDisplayMs);
    updateDelayMessage();

    if (courseEnded) {
        clearInterval(intervalId);
        skipButton.classList.add('hidden');
    }
}

function startTimer() {
    clearInterval(intervalId);

    // Aby sme synchronizovali časovač presne na začiatok každej minúty
    const realNow = new Date();
    const secondsUntilNextMinute = 60 - realNow.getSeconds();
    const msUntilNextMinute = secondsUntilNextMinute * 1000;

    // Prvý raz sa spustí ihneď
    updateBlockAndTimer();

    // Nastavíme timeout na presný čas, kedy sa minúta zmení
    intervalId = setTimeout(() => {
        updateBlockAndTimer();

        // A potom nastavíme interval na každú minútu
        intervalId = setInterval(updateBlockAndTimer, 60000); 
    }, msUntilNextMinute);
}

async function loadSchedule() {
    try {
        // Aby sme eliminovali caching JSONu (problém GitHub Pages), pridáme timestamp
        const timestamp = new Date().getTime();
        const response = await fetch(`blocks.json?t=${timestamp}`);
        
        if (!response.ok) throw new Error(`Chyba pri načítaní JSONu: ${response.status}`);
        schedule = await response.json();
        
        findInitialBlockIndex(); // Tu sa teraz vykoná pokročilá kontrola pri štarte
        startTimer();
    } catch (error) {
        console.error("Nastala chyba pri načítaní rozvrhu:", error);
        blockNameElement.textContent = "CHYBA NAČÍTANIA ROZVRHU";
        timerElement.innerHTML = "XX<span class=\"separator\">:</span>XX";
        delayDisplayElement.textContent = "";
    }
}

// Inicializácia
loadSchedule();