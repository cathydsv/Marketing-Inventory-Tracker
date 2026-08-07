// CONFIGURATION: Replace with your actual Airtable details
const AIRTABLE_BASE_ID = 'appDHZSvIlr63Z4f5';
const AIRTABLE_TOKEN = 'patazE87jjAASpoYd.a184876d404f4df8f8d828c01e5be459db04e43cd3faec3a4bee00ced80c7d77';
const TABLE_NAME = 'Inventory';

let inventoryData = [];
const searchInput = document.getElementById('searchInput');

// 1. Fetch data directly from Airtable API (including Product Images)
function fetchAirtableData() {
    fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Map Airtable records including attachment image URLs
        inventoryData = data.records.map(record => {
            // Checks for 'image' or 'Image' column names
            const imageAttachments = record.fields['image'] || record.fields['Image'];
            const imageUrl = (imageAttachments && imageAttachments.length > 0) 
                ? imageAttachments[0].url 
                : 'https://placehold.co/300x180/eef2f5/002664?text=No+Image';

            return {
                id: record.id,
                sku: record.fields['sku'] || '',
                name: record.fields['item name'] || '',
                qty: record.fields['quantity'] || 0,
                rack: record.fields['rack location'] || '',
                image: imageUrl
            };
        });

        // Handle URL search parameter (?rack=A1-01)
        const urlParams = new URLSearchParams(window.location.search);
        const rackParam = urlParams.get('rack');

        if (rackParam) {
            searchInput.value = rackParam;
            filterInventory(rackParam);
        } else {
            displayInventory(inventoryData);
        }
    })
    .catch(error => console.error("Error fetching Airtable data:", error));
}

// 2. Helper function to step quantity up or down
function adjustQty(recordId, amount) {
    const qtyInput = document.getElementById(`qty-${recordId}`);
    if (qtyInput) {
        let currentQty = parseInt(qtyInput.value, 10) || 0;
        let newQty = currentQty + amount;
        if (newQty < 0) newQty = 0; // Prevents negative stock counts
        qtyInput.value = newQty;
    }
}

// 3. Display items as cards with Product Images & Quantity Controls (+ / -)
function displayInventory(itemsToDisplay) {
    const listContainer = document.getElementById('inventoryList');
    listContainer.innerHTML = '';

    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No items found.</p>';
        return;
    }

    itemsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="item-image" onerror="this.onerror=null; this.src='https://placehold.co/300x180/eef2f5/002664?text=No+Image';">
            <div class="item-name">${item.name}</div>
            <div class="item-details">
                <strong>SKU:</strong> ${item.sku} <br>
                <strong>Rack Location:</strong> ${item.rack} <br><br>
                
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <strong>Qty:</strong> 
                    <button onclick="adjustQty('${item.id}', -1)" style="padding: 4px 10px; background-color: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px;">-</button>
                    <input type="number" id="qty-${item.id}" value="${item.qty}" min="0" style="width: 55px; padding: 4px; border-radius: 4px; border: 1px solid #ccc; text-align: center;">
                    <button onclick="adjustQty('${item.id}', 1)" style="padding: 4px 10px; background-color: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px;">+</button>
                    
                    <button onclick="updateQuantity('${item.id}')" style="padding: 5px 12px; background-color: #002664; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 4px;">Save</button>
                </div>
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

// 4. Update quantity directly in Airtable
function updateQuantity(recordId) {
    const newQtyInput = document.getElementById(`qty-${recordId}`);
    const newQty = parseInt(newQtyInput.value, 10);

    fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                'quantity': newQty
            }
        })
    })
    .then(response => response.json())
    .then(() => {
        alert("Quantity updated successfully!");
    })
    .catch(error => {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity.");
    });
}

// 5. Filtering logic
function filterInventory(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filteredData = inventoryData.filter(item => {
        return item.name.toLowerCase().includes(term) ||
               item.sku.toLowerCase().includes(term) ||
               item.rack.toLowerCase().includes(term);
    });
    
    displayInventory(filteredData);
}

searchInput.addEventListener('input', function(event) {
    filterInventory(event.target.value);
});

// Load data on start
fetchAirtableData();

// 6. QR Code Camera Scanner Logic
let html5QrCode = null;
let isScanning = false;

function toggleScanner() {
    const readerElement = document.getElementById('qr-reader');
    const scanBtn = document.getElementById('scanBtn');

    if (isScanning) {
        // Stop scanning
        html5QrCode.stop().then(() => {
            readerElement.style.display = 'none';
            scanBtn.innerText = '📷 Scan QR Code';
            scanBtn.style.backgroundColor = '#002664';
            isScanning = false;
        }).catch(err => console.error("Error stopping scanner:", err));
    } else {
        // Start scanning
        readerElement.style.display = 'block';
        scanBtn.innerText = '❌ Close Camera';
        scanBtn.style.backgroundColor = '#dc3545';
        isScanning = true;

        html5QrCode = new Html5Qrcode("qr-reader");
        
        const config = { fps: 10, qrbox: { width: 220, height: 220 } };

        html5QrCode.start(
            { facingMode: "environment" }, // Prefers back camera on mobile devices
            config,
            (decodedText) => {
                console.log("Scanned QR Code:", decodedText);

                // Extract parameter if QR code contains full URL (?rack=A1-01)
                let query = decodedText;
                if (decodedText.includes('rack=')) {
                    try {
                        const url = new URL(decodedText);
                        query = url.searchParams.get('rack') || decodedText;
                    } catch (e) {
                        query = decodedText;
                    }
                }

                // Auto-fill search box and filter list
                document.getElementById('searchInput').value = query;
                filterInventory(query);

                // Stop camera after successful scan
                toggleScanner();
            },
            (errorMessage) => {
                // Continuous scanning attempts; keep console quiet
            }
        ).catch(err => {
            console.error("Unable to start camera:", err);
            alert("Could not access camera. Please allow camera permissions in your browser.");
            toggleScanner();
        });
    }
}
