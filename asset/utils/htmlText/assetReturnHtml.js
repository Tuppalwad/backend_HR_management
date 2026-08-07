const assetReturnHtml = (empName, category, assetName, assetId, returnDate) => {
    const subject = 'Asset Return Confirmation';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Asset Returned</h2>
            <p>Dear ${empName},</p>
            <p>This is to confirm that the following asset has been marked as returned:</p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Asset:</strong> ${assetName}</li>
                <li><strong>Asset ID:</strong> ${assetId}</li>
                <li><strong>Return Date:</strong> ${new Date(returnDate).toDateString()}</li>
            </ul>
            <p>Thank you for returning the asset.</p>
            <p>Best regards,<br />Your Company Name</p>
        </div>
    `;

    return { subject, html };
};

module.exports = assetReturnHtml;
