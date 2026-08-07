// ==========================================
// CONFIGURATION & FIELD MAPPING
// ==========================================
const AIRTABLE_BASE_ID = 'appDHZSvIlr63Z4f5';
const AIRTABLE_TOKEN = 'patazE87jjAASpoYd.a184876d404f4df8f8d828c01e5be459db04e43cd3faec3a4bee00ced80c7d77';
const TABLE_NAME = 'Inventory';

// Match these EXACTLY to your column headers in Airtable
const FIELDS = {
    NAME: 'Item Name',
    SKU: 'Item Number',
    RACK: 'Rack Location',
    QTY: 'Quantity',
    IMAGE: 'image'
};

let inventoryData = [];
const searchInput = document.getElementById('searchInput');

// ==========================================
// 1. FETCH DATA FROM AIRTABLE
// ==========================================
function fetchAirtableData() {
    fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.records) {
            console.error("Airtable response missing records:", data);
            return;
        }

        inventoryData = data.records.map(record => {
            const imageAttachments = record.fields[FIELDS.IMAGE] || record.fields['Image'] || record.fields['image'];
            const imageUrl = (imageAttachments && imageAttachments.length > 0) 
                ? imageAttachments[0].url 
                : 'https://placehold.co/300x180/eef2f5/002664?text=No+Image';

            return {
                id: record.id,
                itemNumber: record.fields[FIELDS.SKU] || record.fields['Item Number'] || record.fields['item number'] || 'N/A',
                name: record.fields[FIELDS.NAME] || record.fields['Item Name'] || record.fields['item name'] || 'Unnamed Item',
                qty: parseInt(record.fields[FIELDS.QTY] || record.fields['Quantity'] || record.fields['quantity'], 10) || 0,
                rack: record.fields[FIELDS.RACK] || record.fields['Rack Location'] || record.fields['rack location'] || 'Unassigned',
                image: imageUrl
            };
        });

        updateKPIs(inventoryData);

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

function updateKPIs(data) {
    const totalSkus = data.length;
    const totalItems = data.reduce((sum, item) => sum + item.qty, 0);

    if (document.getElementById('totalSkus')) document.getElementById('totalSkus').innerText = totalSkus;
    if (document.getElementById('totalItems')) document.getElementById('totalItems').innerText = totalItems.toLocaleString();
}

// ==========================================
// 2. DISPLAY INVENTORY CARDS
// ==========================================
function adjustQty(recordId, amount) {
    const qtyInput = document.getElementById(`qty-${recordId}`);
    if (qtyInput) {
        let currentQty = parseInt(qtyInput.value, 10) || 0;
        let newQty = Math.max(0, currentQty + amount);
        qtyInput.value = newQty;
    }
}

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

// Save Quantity directly from card
async function updateQuantity(recordId) {
    const newQtyInput = document.getElementById(`qty-${recordId}`);
    const newQty = parseInt(newQtyInput.value, 10) || 0;

    const payload = { fields: {} };
    payload.fields[FIELDS.QTY] = newQty;

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const item = inventoryData.find(i => i.id === recordId);
        if (item) item.qty = newQty;
        updateKPIs(inventoryData);
        alert("Stock level saved successfully.");
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert(`Failed to update quantity: ${error.message}`);
    }
}

// ==========================================
// 3. CREATE NEW ITEM MODAL
// ==========================================
function openAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        document.getElementById('addForm').reset();
        modal.style.display = 'flex';
    }
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveNewItem(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveAddBtn');
    saveBtn.innerText = 'Creating...';
    saveBtn.disabled = true;

    const name = document.getElementById('addName').value;
    const itemNumber = document.getElementById('addSku').value;
    const rack = document.getElementById('addRack').value;
    const qty = parseInt(document.getElementById('addQty').value, 10) || 0;
    const fileInput = document.getElementById('addImageFile');

    try {
        // Step A: Create Record
        const fieldsPayload = {};
        fieldsPayload[FIELDS.NAME] = name;
        fieldsPayload[FIELDS.SKU] = itemNumber;
        fieldsPayload[FIELDS.RACK] = rack;
        fieldsPayload[FIELDS.QTY] = qty;

        const createResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: fieldsPayload })
        });

        if (!createResponse.ok) {
            const errorPayload = await createResponse.json();
            console.error('Airtable Error Payload:', errorPayload);
            throw new Error(errorPayload.error?.message || `HTTP ${createResponse.status}`);
        }

        const newRecord = await createResponse.json();
        const recordId = newRecord.id;

        // Step B: Upload Image Attachment if selected
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const base64Data = await convertFileToBase64(file);

            const uploadResponse = await fetch(`https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${FIELDS.IMAGE}/uploadAttachment`, {
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
                const imgErr = await uploadResponse.json();
                console.warn('Image upload error:', imgErr);
                alert(`Item created, but image failed to upload: ${imgErr.error?.message || 'Check column name'}`);
            }
        }

        alert('New inventory item created successfully!');
        closeAddModal();
        fetchAirtableData();
    } catch (error) {
        console.error('Error creating item:', error);
        alert(`Failed to create new item:\n${error.message}`);
    } finally {
        saveBtn.innerText = 'Create Item';
        saveBtn.disabled = false;
    }
}

// ==========================================
// 4. EDIT ITEM MODAL
// ==========================================
function openEditModal(recordId) {
    const item = inventoryData.find(i => i.id === recordId);
    if (!item) return;

    document.getElementById('editRecordId').value = item.id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editSku').value = item.itemNumber;
    document.getElementById('editRack').value = item.rack;
    document.getElementById('editQty').value = item.qty;
    document.getElementById('editImageFile').value = '';

    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
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
    const newQty = parseInt(document.getElementById('editQty').value, 10) || 0;
    const fileInput = document.getElementById('editImageFile');

    try {
        // Step A: Patch Fields
        const fieldsPayload = {};
        fieldsPayload[FIELDS.NAME] = newName;
        fieldsPayload[FIELDS.SKU] = newItemNumber;
        fieldsPayload[FIELDS.RACK] = newRack;
        fieldsPayload[FIELDS.QTY] = newQty;

        const patchResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: fieldsPayload })
        });

        if (!patchResponse.ok) {
            const errorPayload = await patchResponse.json();
            console.error('Airtable Error Payload:', errorPayload);
            throw new Error(errorPayload.error?.message || `HTTP ${patchResponse.status}`);
        }

        // Step B: Upload Image Attachment if selected
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const base64Data = await convertFileToBase64(file);

            const uploadResponse = await fetch(`https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${FIELDS.IMAGE}/uploadAttachment`, {
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
                const imgErr = await uploadResponse.json();
                console.warn('Image upload error:', imgErr);
                alert(`Text updated, but image failed to upload: ${imgErr.error?.message || 'Check column name'}`);
            }
        }

        alert('Item updated successfully!');
        closeEditModal();
        fetchAirtableData();
    } catch (error) {
        console.error('Error updating item:', error);
        alert(`Failed to update item:\n${error.message}`);
    } finally {
        saveBtn.innerText = 'Save Changes';
        saveBtn.disabled = false;
    }
}

// Base64 File Reader Helper
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

// ==========================================
// 5. SEARCH & FILTER
// ==========================================
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

// Close pop-up when clicking outside on the backdrop
window.addEventListener('click', (event) => {
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');

    if (event.target === addModal) {
        closeAddModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
});

// Initial Fetch
fetchAirtableData();

// ==========================================
// 6. QR SCANNER LOGIC
// ==========================================
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
            () => {}
        ).catch(err => {
            console.error("Unable to start camera:", err);
            alert("Could not access camera. Please check permissions.");
            toggleScanner();
        });
    }
}
