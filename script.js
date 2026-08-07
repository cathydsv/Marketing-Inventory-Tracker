// CONFIGURATION: Replace with your actual Airtable details
const AIRTABLE_BASE_ID = 'appDHZSvIlr63Z4f5'; // e.g., 'app123456789'
const AIRTABLE_TOKEN = 'patazE87jjAASpoYd.a184876d404f4df8f8d828c01e5be459db04e43cd3faec3a4bee00ced80c7d77'; // e.g., 'patXXXXXXX'
const TABLE_NAME = 'Inventory';

let inventoryData = [];
const searchInput = document.getElementById('searchInput');

// 1. Fetch data directly from Airtable API
function fetchAirtableData() {
    fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Map Airtable records using YOUR exact column names
        inventoryData = data.records.map(record => ({
            id: record.id,
            sku: record.fields['sku'] || '',
            name: record.fields['item name'] || '',
            qty: record.fields['quantity'] || 0,
            rack: record.fields['rack location'] || ''
        }));

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

// 2. Display items with Editable Quantity Controls
function displayInventory(itemsToDisplay) {
    const listContainer = document.getElementById('inventoryList');
    listContainer.innerHTML = '';

    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p>No items found.</p>';
        return;
    }

    itemsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        card.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-details">
                <strong>SKU:</strong> ${item.sku} <br>
                <strong>Rack Location:</strong> ${item.rack} <br><br>
                <strong>Qty:</strong> 
                <input type="number" id="qty-${item.id}" value="${item.qty}" style="width: 70px; padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
                <button onclick="updateQuantity('${item.id}')" style="padding: 5px 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Save</button>
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

// 3. Update quantity directly in Airtable
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
                'quantity': newQty // Updates your 'quantity' column in Airtable
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

// 4. Filtering logic
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