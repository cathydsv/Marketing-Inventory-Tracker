// This variable will hold our inventory data once it loads
let inventoryData = [];

// 1. Fetch the data from the JSON file
fetch('inventory.json')
    .then(response => response.json())
    .then(data => {
        inventoryData = data;
        displayInventory(inventoryData); // Show all items initially
    })
    .catch(error => console.error("Error loading JSON:", error));

// 2. Function to display items on the screen
function displayInventory(itemsToDisplay) {
    const listContainer = document.getElementById('inventoryList');
    
    // Clear out the container first
    listContainer.innerHTML = '';

    // If no items match the search
    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p>No items found.</p>';
        return;
    }

    // Loop through each item and create a visual card
    itemsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        card.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-details">
                <strong>SKU:</strong> ${item.sku} <br>
                <strong>Qty:</strong> ${item.qty} <br>
                <strong>Rack:</strong> ${item.rack}
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

// 3. Search functionality
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', function(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Filter the inventory based on Name, SKU, or Rack
    const filteredData = inventoryData.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               item.sku.toLowerCase().includes(searchTerm) ||
               item.rack.toLowerCase().includes(searchTerm);
    });
    
    // Update the screen with only the filtered items
    displayInventory(filteredData);
});