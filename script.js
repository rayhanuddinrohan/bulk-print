let customerCount = 1;
let pdfDoc = null;

document.getElementById('addCustomer').addEventListener('click', function() {
    const customerForms = document.getElementById('customerForms');
    const newForm = document.createElement('div');
    newForm.className = 'customer-form';
    newForm.dataset.index = customerCount;
    newForm.innerHTML = `
        <h3>Customer ${customerCount + 1}</h3>
        <label for="customerName${customerCount}">Customer Name:</label>
        <input type="text" id="customerName${customerCount}" required>
        <label for="customerContacts${customerCount}">Contacts:</label>
        <input type="text" id="customerContacts${customerCount}" placeholder="Email or Phone">
        <label for="constID${customerCount}">Const ID:</label>
        <input type="text" id="constID${customerCount}">
        <label for="customerAddress${customerCount}">Address:</label>
        <textarea id="customerAddress${customerCount}"></textarea>
        <label for="collectableAmount${customerCount}">Collectable Amount:</label>
        <input type="text" id="collectableAmount${customerCount}" placeholder="$100.00">
    `;
    customerForms.appendChild(newForm);
    customerCount++;
    console.log(`Added customer form ${customerCount}`);
});

document.getElementById('generatePDF').addEventListener('click', async function() {
    try {
        // Validate store form
        const storeContacts = document.getElementById('storeContacts').value;
        if (!storeContacts) {
            alert('Please fill in FAYA contacts.');
            return;
        }

        // Collect customer data
        const customers = [];
        for (let i = 0; i < customerCount; i++) {
            const name = document.getElementById(`customerName${i}`).value;
            const contacts = document.getElementById(`customerContacts${i}`).value;
            const constID = document.getElementById(`constID${i}`).value;
            const address = document.getElementById(`customerAddress${i}`).value;
            const amount = document.getElementById(`collectableAmount${i}`).value;
            if (name) {
                customers.push({
                    name: name || 'N/A',
                    contacts: contacts || 'N/A',
                    constID: constID || 'N/A',
                    address: address || 'N/A',
                    amount: amount || 'N/A'
                });
                console.log(`Collected customer ${i + 1}:`, customers[customers.length - 1]);
            }
        }
        if (customers.length === 0) {
            alert('Please fill in at least one customer’s name.');
            return;
        }

        // Initialize jsPDF in landscape
        const { jsPDF } = window.jspdf;
        pdfDoc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

        // Load images from assets folder
        const loadImage = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${url}. Ensure the file exists in the assets folder and is a valid PNG or JPEG.`));
            img.src = url;
        });

        const [logoData, qrData] = await Promise.all([
            loadImage('assets/logo.png').catch((err) => { throw new Error(err.message); }),
            loadImage('assets/qr.png').catch((err) => { throw new Error(err.message); })
        ]);

        // Divide page into 2x2 grid (A4 landscape: 841.89pt x 595.28pt)
        const quadWidth = 841.89 / 2;
        const quadHeight = 595.28 / 2;
        const positions = [
            { x: 0, y: 0 },
            { x: quadWidth, y: 0 },
            { x: 0, y: quadHeight },
            { x: quadWidth, y: quadHeight }
        ];

        // Process customers in groups of 4
        for (let i = 0; i < customers.length; i += 4) {
            if (i > 0) pdfDoc.addPage('a4', 'landscape');
            const pageCustomers = customers.slice(i, i + 4);

            pageCustomers.forEach((customer, index) => {
                const { x, y } = positions[index];
                const offsetX = x + 20;
                const offsetY = y + 20;
                const midX = x + quadWidth / 2;

                // Store Logo (Top-left, 50pt x 50pt)
                pdfDoc.addImage(logoData, 'PNG', offsetX, offsetY + 10, 50, 50);

                // QR Code (Top-right, 50pt x 50pt)
                pdfDoc.addImage(qrData, 'PNG', x + quadWidth - 70, offsetY + 10, 50, 50);

                // Shipped from FAYA (Middle and bottom-left)
                pdfDoc.setFontSize(14);
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.text("Shipped from FAYA", offsetX, offsetY + 70);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.text(`Contacts: ${storeContacts}`, offsetX, offsetY + 85, { maxWidth: quadWidth / 2 - 30 });

                // Customer Details (Middle and bottom-right)
                
                pdfDoc.text("Customer Details", midX + 10, offsetY + 70);
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.text(`Name: ${customer.name}`, midX + 10, offsetY + 85);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.text(`Contacts: ${customer.contacts}`, midX + 10, offsetY + 100);
                pdfDoc.text(`Address: ${customer.address}`, midX + 10, offsetY + 115, { maxWidth: quadWidth / 2 - 30 });
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.text(`Const ID: ${customer.constID}`, midX + 10, offsetY + 145);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.text(`Collectable Amount: ${customer.amount}`, midX + 10, offsetY + 160);

                // Footer (Centered at bottom)
                pdfDoc.setFontSize(18);
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.text(`Thank you for shopping with FAYA!`, x + quadWidth / 2, y + quadHeight - 65, { align: "center" });

                // Draw quadrant borders (optional)
                pdfDoc.setDrawColor(100);
                pdfDoc.rect(x, y, quadWidth, quadHeight);
            });
        }

        // Display PDF preview
        const pdfBlob = pdfDoc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.getElementById('pdfIframe');
        iframe.src = pdfUrl;
        document.getElementById('pdfPreview').style.display = 'block';

        // Enable download button
        const downloadButton = document.getElementById('downloadPDF');
        downloadButton.style.display = 'block';
        downloadButton.onclick = function() {
            pdfDoc.save('order_receipt.pdf');
            console.log('PDF downloaded');
        };

        console.log('PDF generated with', customers.length, 'customers');
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert(`Failed to generate PDF: ${error.message}`);
    }
});