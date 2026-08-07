// CONFIGURATION: Replace with your actual Airtable details
const AIRTABLE_BASE_ID = 'appDHZSvIlr63Z4f5';
const AIRTABLE_TOKEN = 'patazE87jjAASpoYd.a184876d404f4df8f8d828c01e5be459db04e43cd3faec3a4bee00ced80c7d77';
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
        inventoryData = data.records.map(record => {
            const imageAttachments = record.fields['image'] || record.fields['Image'];
            const imageUrl = (imageAttachments && imageAttachments.length > 0) 
                ? imageAttachments[0].url 
                : 'https://placehold.co/300x180/eef2f5/002664?text=No+Image';

            return {
                id: record.id,
                itemNumber: record.fields['item number'] || record.fields['Item Number'] || record.fields['sku'] || 'N/A',
                name: record.fields['item name'] || record.fields['Item Name'] || 'Unnamed Item',
                qty: parseInt(record.fields['quantity'], 10) || 0,
                rack: record.fields['rack location'] || record.fields['Rack Location'] || 'Unassigned',
                image: imageUrl
            };
        });

        // Update Dashboard Stats Bar
        updateKPIs(inventoryData);

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

// Update Top KPI Metrics
function updateKPIs(data) {
    const totalSkus = data.length;
    const totalItems = data.reduce((sum, item) => sum + item.qty, 0);

    if (document.getElementById('totalSkus')) document.getElementById('totalSkus').innerText = totalSkus;
    if (document.getElementById('totalItems')) document.getElementById('totalItems').innerText = totalItems.toLocaleString();
}

// 2. Helper function to step quantity
function adjustQty(recordId, amount) {
    const qtyInput = document.getElementById(`qty-${recordId}`);
    if (qtyInput) {
        let currentQty = parseInt(qtyInput.value, 10) || 0;
        let newQty = currentQty + amount;
        if (newQty < 0) newQty = 0;
        qtyInput.value = newQty;
    }
}

// 3. Display items as DSV Cards
function displayInventory(itemsToDisplay) {
    const listContainer = document.getElementById('inventoryList');
    listContainer.innerHTML = '';

    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #5e6d82;">No inventory records match your query.</p>';
        return;
    }

    itemsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        card.innerHTML = `
            <div>
                <div class="card-header-bar">
                    <div class="item-name">${item.name}</div>
                    <button onclick="openEditModal('${item.id}')" class="btn-edit-card">✏️ Edit</button>
                </div>
                <img src="${item.image}" alt="${item.name}" class="item-image" onerror="this.onerror=null; this.src='https://placehold.co/300x180/eef2f5/002664?text=No+Image';">
            </div>
            
            <div class="item-details">
                <strong>Item Number:</strong> ${item.itemNumber} <br>
                <strong>Rack Location:</strong> ${item.rack} <br><br>
                
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <strong style="color: #0d1e3a;">Qty:</strong> 
                    <button onclick="adjustQty('${item.id}', -1)" style="padding: 4px 10px; background-color: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer; font-weight: bold;">-</button>
                    <input type="number" id="qty-${item.id}" value="${item.qty}" min="0" style="width: 50px; padding: 4px; border-radius: 3px; border: 1px solid #ccc; text-align: center;">
                    <button onclick="adjustQty('${item.id}', 1)" style="padding: 4px 10px; background-color: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer; font-weight: bold;">+</button>
                    
                    <button onclick="updateQuantity('${item.id}')" style="padding: 5px 12px; background-color: #002664; color: white; border: none; border-radius: 3px; cursor: pointer; margin-left: auto; font-weight: 600;">Save</button>
                </div>
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

// Quick Quantity Save from Card
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
        const item = inventoryData.find(i => i.id === recordId);
        if (item) item.qty = newQty;
        updateKPIs(inventoryData);
        alert("Stock level saved successfully.");
    })
    .catch(error => {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity.");
    });
}

// 4. Create New Item Handlers
function openAddModal() {
    document.getElementById('addForm').reset();
    document.getElementById('addModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
}

async function saveNewItem(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveAddBtn');
    saveBtn.innerText = 'Creating...';
    saveBtn.disabled = true;

    const name = document.getElementById('addName').value;
    const itemNumber = document.getElementById('addSku').value;
    const rack = document.getElementById('addRack').value;
    const qty = parseInt(document.getElementById('addQty').value, 10);
    const fileInput = document.getElementById('addImageFile');

    try {
        // Step A: Create the new record in Airtable
        const createResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'item name': name,
                    'item number': itemNumber,
                    'rack location': rack,
                    'quantity': qty
                }
            })
        });

        if (!createResponse.ok) throw new Error('Failed to create item in Airtable.');
        const newRecord = await createResponse.json();
        const recordId = newRecord.id;

        // Step B: Upload image attachment if file provided
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const base64Data = await convertFileToBase64(file);

            const uploadResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/image/uploadAttachment`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contentType: file.type,
                    file: base64Data,
                    filename: file.name
                })
            });

            if (!uploadResponse.ok) {
                await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/Image/uploadAttachment`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contentType: file.type,
                        file: base64Data,
                        filename: file.name
                    })
                });
            }
        }

        alert('New inventory item created successfully!');
        closeAddModal();
        fetchAirtableData(); // Reload inventory & update stats
    } catch (error) {
        console.error('Error creating item:', error);
        alert('Failed to create new item. Check console for details.');
    } finally {
        saveBtn.innerText = 'Create Item';
        saveBtn.disabled = false;
    }
}

// 5. Edit Item Modal Handlers
function openEditModal(recordId) {
    const item = inventoryData.find(i => i.id === recordId);
    if (!item) return;

    document.getElementById('editRecordId').value = item.id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editSku').value = item.itemNumber;
    document.getElementById('editRack').value = item.rack;
    document.getElementById('editQty').value = item.qty;
    document.getElementById('editImageFile').value = '';

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveItemEdits(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveEditBtn');
    saveBtn.innerText = 'Saving...';
    saveBtn.disabled = true;

    const recordId = document.getElementById('editRecordId').value;
    const newName = document.getElementById('editName').value;
    const newItemNumber = document.getElementById('editSku').value;
    const newRack = document.getElementById('editRack').value;
    const newQty = parseInt(document.getElementById('editQty').value, 10);
    const fileInput = document.getElementById('editImageFile');

    try {
        const patchResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'item name': newName,
                    'item number': newItemNumber,
                    'rack location': newRack,
                    'quantity': newQty
                }
            })
        });

        if (!patchResponse.ok) throw new Error('Failed to update fields.');

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const base64Data = await convertFileToBase64(file);

            const uploadResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/image/uploadAttachment`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contentType: file.type,
                    file: base64Data,
                    filename: file.name
                })
            });

            if (!uploadResponse.ok) {
                await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/Image/uploadAttachment`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contentType: file.type,
                        file: base64Data,
                        filename: file.name
                    })
                });
            }
        }

        alert('Item updated successfully!');
        closeEditModal();
        fetchAirtableData();
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item details. Check console for details.');
    } finally {
        saveBtn.innerText = 'Save Changes';
        saveBtn.disabled = false;
    }
}

// Utility: Convert uploaded file to Base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// 6. Filtering logic
function filterInventory(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filteredData = inventoryData.filter(item => {
        return item.name.toLowerCase().includes(term) ||
               item.itemNumber.toLowerCase().includes(term) ||
               item.rack.toLowerCase().includes(term);
    });
    
    displayInventory(filteredData);
}

searchInput.addEventListener('input', function(event) {
    filterInventory(event.target.value);
});

// Load data on start
fetchAirtableData();

// 7. QR Code Scanner Logic
let html5QrCode = null;
let isScanning = false;

function toggleScanner() {
    const readerElement = document.getElementById('qr-reader');
    const scanBtn = document.getElementById('scanBtn');

    if (isScanning) {
        html5QrCode.stop().then(() => {
            readerElement.style.display = 'none';
            scanBtn.innerText = '📷 Scan QR Code';
            scanBtn.style.backgroundColor = '#002664';
            isScanning = false;
        }).catch(err => console.error("Error stopping scanner:", err));
    } else {
        readerElement.style.display = 'block';
        scanBtn.innerText = '❌ Close Camera';
        scanBtn.style.backgroundColor = '#d9534f';
        isScanning = true;

        html5QrCode = new Html5Qrcode("qr-reader");
        const config = { fps: 10, qrbox: { width: 220, height: 220 } };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                let query = decodedText;
                if (decodedText.includes('rack=')) {
                    try {
                        const url = new URL(decodedText);
                        query = url.searchParams.get('rack') || decodedText;
                    } catch (e) {
                        query = decodedText;
                    }
                }

                document.getElementById('searchInput').value = query;
                filterInventory(query);
                toggleScanner();
            },
            (errorMessage) => {}
        ).catch(err => {
            console.error("Unable to start camera:", err);
            alert("Could not access camera. Please check permissions.");
            toggleScanner();
        });
    }
}
