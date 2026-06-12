import { LoadHeaderFooter } from "./utils.mjs";

LoadHeaderFooter();

// Use an IIFE implementation learned in W05 of WDD330
(async () => {
    try {
        const res = await fetch('data/UsAirports.json');
        const data = await res.json()
        document.querySelector('#json-display').textContent = JSON.stringify(data, null, 2);
        document.querySelector('#json-status').textContent = "JSON file loaded";
    } catch (err) {
        console.error('Error loading airport data:', err);
        document.querySelector('#json-status').textContent = "Error loading JSON file";
    }
})();