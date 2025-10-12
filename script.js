const DELAY_MINUTES = 0;

const blockNameElement = document.getElementById('current-block-name');
const timerElement = document.getElementById('simple-timer');
const delayDisplayElement = document.getElementById('delay-display');
const skipButton = document.getElementById('skip-button'); 

let schedule = [];
let intervalId;
let currentBlockIndex = -1; 

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

function skipToNextBlock() {
    if (currentBlockIndex < schedule.length - 1) {
        currentBlockIndex++; 
        updateBlockAndTimer(); 
    }
    skipButton.classList.add('hidden');
    skipButton.classList.remove('visible');
}

skipButton.addEventListener('click', skipToNextBlock);

function findInitialBlockIndex() {
    let now = new Date();
    const delayMs = DELAY_MINUTES * 60 * 1000;
    now = new Date(now.getTime() - delayMs); 
    
    const blocksWithDates = schedule.map(block => ({
        ...block,
        startDate: new Date(block.start),
        endDate: new Date(block.end)
    }));

    let index = blocksWithDates.findLastIndex(block => now >= block.startDate);

    if (index === -1) {
        currentBlockIndex = -1;
        return;
    }

    while (index < blocksWithDates.length - 1 && now >= blocksWithDates[index].endDate) {
        index++;
    }
    
    currentBlockIndex = index;
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
    
    let timeToDisplayMs = 0;
    let blockName = "MIMO ROZVRHU"; 
    let courseEnded = false;

    skipButton.classList.add('hidden');
    skipButton.classList.remove('visible');


    if (currentBlockIndex === -1 && blocks.length > 0) {
        const firstBlock = blocks[0];
        timeToDisplayMs = firstBlock.startDate - now;
        blockName = "Nasleduje: " + firstBlock.name;

        if (now >= firstBlock.startDate) {
            currentBlockIndex = 0;
            return updateBlockAndTimer();
        }

    } else if (currentBlockIndex >= 0 && currentBlockIndex < blocks.length) {
        const currentBlock = blocks[currentBlockIndex];

        timeToDisplayMs = currentBlock.endDate - now;
        blockName = currentBlock.name;

        if (timeToDisplayMs <= 0 && currentBlockIndex === blocks.length - 1) {
            blockName = "KURZ SKONČIL";
            timeToDisplayMs = 0;
            courseEnded = true;
        }

        if (timeToDisplayMs < 0 && currentBlockIndex < blocks.length - 1) {
            skipButton.classList.add('visible');
            skipButton.classList.remove('hidden');
        }
        
    } else {
        blockName = "KURZ SKONČIL";
        timeToDisplayMs = 0;
        courseEnded = true;
    }

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

    const realNow = new Date();
    const secondsUntilNextMinute = 60 - realNow.getSeconds();
    const msUntilNextMinute = secondsUntilNextMinute * 1000;

    updateBlockAndTimer();

    intervalId = setTimeout(() => {
        updateBlockAndTimer();

        intervalId = setInterval(updateBlockAndTimer, 60000); 
    }, msUntilNextMinute);
}

async function loadSchedule() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`blocks.json?t=${timestamp}`);
        
        if (!response.ok) throw new Error(`Chyba pri načítaní JSONu: ${response.status}`);
        schedule = await response.json();
        
        findInitialBlockIndex();
        startTimer();
    } catch (error) {
        console.error("Nastala chyba pri načítaní rozvrhu:", error);
        blockNameElement.textContent = "CHYBA NAČÍTANIA ROZVRHU";
        timerElement.innerHTML = "XX<span class=\"separator\">:</span>XX";
        delayDisplayElement.textContent = "";
    }
}

loadSchedule();