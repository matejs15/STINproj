const CURRENCIES = ["AUD","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD","HUF","ILS","JPY","MXN","NOK","NZD","PHP","PLN","RON","SEK","SGD","THB","TRY","USD","ZAR"];
const selected = new Set();
let currentLang = 'cs';

document.addEventListener("DOMContentLoaded", function() {
    const chipsDiv = document.getElementById("chips");

    if (chipsDiv) {
        for (let i = 0; i < CURRENCIES.length; i++) {
            let currency = CURRENCIES[i];

            let chip = document.createElement("div");
            chip.className = "chip";
            chip.id = "chip-" + currency;
            chip.textContent = currency;

            chip.onclick = function() {
                if (selected.has(currency)) {
                    selected.delete(currency);
                    chip.classList.remove("on");
                } else {
                    selected.add(currency);
                    chip.classList.add("on");
                }
            };

            chipsDiv.appendChild(chip);
        }
    }

    const savedLang = localStorage.getItem("preferredLang") || "cs";
    document.getElementById("langSwitch").value = savedLang;
    changeLanguage(savedLang);
    loadSettings();
});

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("preferredLang", lang);

    if (lang === "cs") {
        document.documentElement.lang = "cs";
        document.getElementById("titleText").textContent = "Currency Analyzer";
        document.getElementById("settingsTitle").textContent = "Nastavení";
        document.getElementById("settingsDescription").textContent = "Vyber základní měnu, období a měny pro porovnání.";
        document.getElementById("baseCurrencyLabel").textContent = "Základní měna";
        document.getElementById("dateRangeLabel").textContent = "Časové období";
        document.getElementById("trackedCurrenciesLabel").textContent = "Vybrané měny";
        document.getElementById("loadBtn").textContent = "Načíst data";
        document.getElementById("saveBtn").textContent = "Uložit nastavení";
        document.getElementById("strongestLabel").textContent = "Nejsilnější měna";
        document.getElementById("weakestLabel").textContent = "Nejslabší měna";
        document.getElementById("tableTitle").textContent = "Kurzy";
        document.getElementById("tableCurrencyHeader").textContent = "Měna";
        document.getElementById("tableRateHeader").textContent = "Kurz vůči základní";
        document.getElementById("tableDateHeader").textContent = "Průměr za dobu";
    } else {
        document.documentElement.lang = "en";
        document.getElementById("titleText").textContent = "Currency Analyzer";
        document.getElementById("settingsTitle").textContent = "Settings";
        document.getElementById("settingsDescription").textContent = "Choose base currency, date range and currencies for comparison.";
        document.getElementById("baseCurrencyLabel").textContent = "Base currency";
        document.getElementById("dateRangeLabel").textContent = "Date range";
        document.getElementById("trackedCurrenciesLabel").textContent = "Selected currencies";
        document.getElementById("loadBtn").textContent = "Load data";
        document.getElementById("saveBtn").textContent = "Save settings";
        document.getElementById("strongestLabel").textContent = "Strongest currency";
        document.getElementById("weakestLabel").textContent = "Weakest currency";
        document.getElementById("tableTitle").textContent = "Exchange rates";
        document.getElementById("tableCurrencyHeader").textContent = "Currency";
        document.getElementById("tableRateHeader").textContent = "Rate against base";
        document.getElementById("tableDateHeader").textContent = "Average for period";
    }
}

function getSelectErrorText() {
    if (currentLang === "cs") {
        return "Vyber alespoň jednu měnu.";
    } else {
        return "Select at least one currency.";
    }
}

function getSaveSuccessText() {
    if (currentLang === "cs") {
        return "Nastavení uloženo!";
    } else {
        return "Settings saved!";
    }
}

function getSaveErrorText() {
    if (currentLang === "cs") {
        return "Chyba při ukládání.";
    } else {
        return "Error while saving.";
    }
}

function getLoadErrorText() {
    if (currentLang === "cs") {
        return "Nepodařilo se načíst uložené nastavení.";
    } else {
        return "Error while loading saved settings.";
    }
}

function getApiErrorText() {
    if (currentLang === "cs") {
        return "Nepodařilo se načíst data z API.";
    } else {
        return "Unable to fetch data from API.";
    }
}

function getDateErrorText() {
    if (currentLang === "cs") {
        return "Datum Od musí být dříve než Do.";
    } else {
        return "Date From must be earlier than Date To.";
    }
}

function getRateLabelText() {
    if (currentLang === "cs") {
        return "kurz";
    } else {
        return "rate";
    }
}

async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const s = await res.json();
        if (s.baseCurrency) {
            document.getElementById("base").value = s.baseCurrency;
        }
        const savedCurr = s.selectedCurrencies || [];
        for (let i = 0; i < savedCurr.length; i++) {
            let curr = savedCurr[i];
            selected.add(curr);
            let chip = document.getElementById("chip-" + curr);
            if (chip) {
                chip.classList.add("on");
            }
        }
    } catch(e) {
        console.log(getLoadErrorText());
        const errorBox = document.getElementById("errorBox");
        errorBox.textContent = getLoadErrorText();
        errorBox.style.display = "block";
    }
}

async function saveSettings() {
    const base = document.getElementById("base").value;
    const symbols = Array.from(selected).join(",");
    if (symbols === "") {
        alert(getSelectErrorText());
        return;
    }
    try {
        const response = await fetch(`/api/settings/save?base=${base}&symbols=${symbols}`);
        if (response.ok) {
            alert(getSaveSuccessText());
        } else {
            alert(getSaveErrorText());
        }
    } catch(e) {
        alert(getSaveErrorText());
    }
}

async function loadData() {
    const base = document.getElementById("base").value;
    const from = document.getElementById("dateFrom").value;
    const to = document.getElementById("dateTo").value;
    const helpArr = Array.from(selected);
    const symbols = helpArr.join(",");

    if (!symbols) return alert(getSelectErrorText());

    if(from > to){
        document.getElementById("errorBox").textContent = getDateErrorText();
        document.getElementById("errorBox").style.display = "block";
        return;
    }
    try {
        const responses = await Promise.all([
            fetch(`/api/rates?base=${base}&symbols=${symbols}`),
            fetch(`/api/strongest?base=${base}&symbols=${symbols}`),
            fetch(`/api/weakest?base=${base}&symbols=${symbols}`),
            fetch(`/api/date?base=${base}&symbols=${symbols}&dateFrom=${from}&dateTo=${to}`)
        ]);

        const [ratesData, strongData, weakData, avgsData] = await Promise.all(responses.map(r => r.json()));

        const fillBox = (id, rateId, data) => {
            const [currency] = Object.keys(data);
            if (currency) {
                document.getElementById(id).textContent = currency;
                document.getElementById(rateId).textContent = getRateLabelText() + ": " + data[currency].toFixed(5);
            }
        };

        fillBox("strongest", "strongestRate", strongData);
        fillBox("weakest", "weakestRate", weakData);

        const actualRates = ratesData.rates || {};
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = "";
        const keys = Object.keys(actualRates);
        for (let i = 0; i < keys.length; i++) {
            let curr = keys[i];
            let rate = actualRates[curr];
            let avg = avgsData[curr] || 0;
            let row = `
                <tr>
                    <td><strong>${curr}</strong></td>
                    <td>${rate.toFixed(5)}</td>
                    <td class="text-info">${avg.toFixed(5)}</td>
                </tr>
            `;

            tableBody.innerHTML += row;
        }


        document.getElementById("results").style.display = "block";
        document.getElementById("errorBox").style.display = "none";

    } catch(e) {
        document.getElementById("errorBox").textContent = getApiErrorText();
        document.getElementById("errorBox").style.display = "block";
    }
}
