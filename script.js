const DELAY_MINUTES = 5;

const blockNameElement = document.getElementById('current-block-name');
const timerElement = document.getElementById('simple-timer');
const delayDisplayElement = document.getElementById('delay-display');

let schedule = [];
let intervalId;

function formatTimeHHMM(ms) {
    if (ms < 0) ms = 0;

    const totalMinutes = Math.ceil(ms / (1000 * 60)); 
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const pad = (num) => String(num).padStart(2, '0');
    
    const currH = pad(hours);
    const currM = pad(minutes);

    return `${currH}<span class="separator">:</span>${currM}`;
}

function updateDelayMessage() {
    if (DELAY_MINUTES === 0) {
        delayDisplayElement.textContent = `Meškanie: ${DELAY_MINUTES} min`;
    } else if (DELAY_MINUTES > 0) {
        delayDisplayElement.textContent = `Meškanie: ${DELAY_MINUTES} min`;
    } else {
        delayDisplayElement.textContent = `Náskok: ${DELAY_MINUTES} min`;
    }
}

async function loadSchedule() {
    try {
        const response = await fetch('blocks.json');
        if (!response.ok) throw new Error(`Chyba pri načítaní JSONu: ${response.status}`);
        schedule = await response.json();
        startTimer();
    } catch (error) {
        console.error("Nastala chyba pri načítaní rozvrhu:", error);
        blockNameElement.textContent = "CHYBA NAČÍTANIA ROZVRHU";
        timerElement.innerHTML = "XX<span class=\"separator\">:</span>XX";
        delayDisplayElement.textContent = "";
    }
}

function updateBlockAndTimer() {
    let now = new Date();

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
        timeToDisplayMs = currentBlock.endDate - now;
        blockName = currentBlock.name;
    } else {
        const nextBlock = blocks.find(block => now < block.startDate);

        if (nextBlock) {
            timeToDisplayMs = nextBlock.startDate - now;
            blockName = "Nasleduje: " + nextBlock.name;
        } else {
            blockName = "KURZ SKONČIL";
            timeToDisplayMs = 0;
            courseEnded = true;
        }
    }

    blockNameElement.textContent = blockName;
    timerElement.innerHTML = formatTimeHHMM(timeToDisplayMs);
    updateDelayMessage();

    if (courseEnded) {
        clearInterval(intervalId);
    }
}

function startTimer() {
    clearInterval(intervalId);

    const realNow = new Date();
    const secondsUntilNextMinute = 60 - realNow.getSeconds();
    const msUntilNextMinute = secondsUntilNextMinute * 1000;

    updateBlockAndTimer();

    intervalId = setTimeout(() => {
        updateBlockAndTimer();

        intervalId = setInterval(updateBlockAndTimer, 60000); 
    }, msUntilNextMinute);
}

loadSchedule();