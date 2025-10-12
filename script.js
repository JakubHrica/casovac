// ==============================================================================
// KONFIGURÁCIA
// ==============================================================================

// Nastavenie globálneho meškania pre celý rozvrh
// Hodnota je v minútach. Napr. 5 = meškanie 5 minút, -5 = náskok 5 minút.
const DELAY_MINUTES = 0; // <--- NASTAV TU MEŠKANIE V MINÚTACH

// ==============================================================================
// Elementy a premenné
// ==============================================================================
const blockNameElement = document.getElementById('current-block-name');
const timerElement = document.getElementById('simple-timer');
const delayDisplayElement = document.getElementById('delay-display'); // NOVÝ ELEMENT

let schedule = [];
let intervalId;

// ---------------------------------------------------------------------------------
// FUNKCIE PRE ZOBRAZENIE ČASU A MEŠKANIA
// ---------------------------------------------------------------------------------

/**
 * Formátuje milisekundy na reťazec HH:MM.
 * @param {number} ms - Milisekundy zostávajúceho času.
 */
function formatTimeHHMM(ms) {
    if (ms < 0) ms = 0;
    
    // Zaokrúhľujeme hore na celú minútu
    const totalMinutes = Math.ceil(ms / (1000 * 60)); 
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const pad = (num) => String(num).padStart(2, '0');
    
    const currH = pad(hours);
    const currM = pad(minutes);

    // Vytvoríme reťazec s HTML spanom pre bielu dvojbodku
    return `${currH}<span class="separator">:</span>${currM}`;
}

/**
 * Zobrazí správu o meškaní na základe konštanty DELAY_MINUTES.
 */
function updateDelayMessage() {
    if (DELAY_MINUTES === 0) {
        delayDisplayElement.textContent = `Meškanie: ${DELAY_MINUTES} min`;
    } else if (DELAY_MINUTES > 0) {
        delayDisplayElement.textContent = `Meškanie: ${DELAY_MINUTES} min`;
    } else {
        // Meškanie je negatívne (náskok)
        delayDisplayElement.textContent = `Náskok: ${DELAY_MINUTES} min`;
    }
}

// ---------------------------------------------------------------------------------
// HLAVNÁ LOGIKA ROZVRHU 
// ---------------------------------------------------------------------------------

async function loadSchedule() {
    try {
        const response = await fetch('blocks.json');
        if (!response.ok) throw new Error(`Chyba pri načítaní JSONu: ${response.status}`);
        schedule = await response.json();
        startTimer();
    } catch (error) {
        console.error("Nastala chyba pri načítaní rozvrhu:", error);
        blockNameElement.textContent = "CHYBA NAČÍTANIA ROZVRHU";
        timerElement.innerHTML = "00<span class=\"separator\">:</span>00"; 
        delayDisplayElement.textContent = "";
    }
}

function updateBlockAndTimer() {
    let now = new Date();
    
    // APLIKÁCIA MEŠKANIA: 
    const delayMs = DELAY_MINUTES * 60 * 1000;
    now = new Date(now.getTime() - delayMs); 

    const blocks = schedule.map(block => ({
        ...block,
        startDate: new Date(block.start),
        endDate: new Date(block.end)
    }));

    const currentBlock = blocks.find(block => now >= block.startDate && now < block.endDate);
    let timeToDisplayMs = 0;
    let blockName = "MIMO ROZVRHU"; 
    let courseEnded = false;

    if (currentBlock) {
        // Aktuálny blok
        timeToDisplayMs = currentBlock.endDate - now;
        blockName = currentBlock.name;
    } else {
        // Hľadáme nasledujúci blok (Prestávka)
        const nextBlock = blocks.find(block => now < block.startDate);

        if (nextBlock) {
            timeToDisplayMs = nextBlock.startDate - now;
            blockName = "PRESTÁVKA: " + nextBlock.name;
        } else {
            // Kurz skončil
            blockName = "KURZ SKONČIL";
            timeToDisplayMs = 0;
            courseEnded = true;
        }
    }
    
    // Aktualizácia DOM
    blockNameElement.textContent = blockName;
    timerElement.innerHTML = formatTimeHHMM(timeToDisplayMs);
    updateDelayMessage(); // NOVINKA: Aktualizujeme správu o meškaní
    
    // Ak kurz skončil, zastavíme interval
    if (courseEnded) {
        clearInterval(intervalId);
    }
}

function startTimer() {
    // 1. Zrušíme akýkoľvek predchádzajúci interval
    clearInterval(intervalId);
    
    // 2. Vypočítame, koľko milisekúnd zostáva do najbližšej celej minúty
    const realNow = new Date();
    const secondsUntilNextMinute = 60 - realNow.getSeconds();
    const msUntilNextMinute = secondsUntilNextMinute * 1000;

    // 3. Okamžite aktualizujeme stav
    updateBlockAndTimer();

    // 4. Použijeme setTimeout na prvé spustenie presne v celú minútu
    intervalId = setTimeout(() => {
        // Spustíme prvú aktualizáciu
        updateBlockAndTimer();

        // 5. Potom nastavíme interval na presne 60 sekúnd
        intervalId = setInterval(updateBlockAndTimer, 60000); 
    }, msUntilNextMinute);
}


// ---------------------------------------------------------------------------------
// Inicializácia
// ---------------------------------------------------------------------------------

loadSchedule();