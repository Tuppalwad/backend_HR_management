const assetAssignHtml = (empName, category, assetName, assetId, assignedDate) => {
    const subject = 'Asset Assigned to You';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Asset Assigned</h2>
            <p>Dear ${empName},</p>
            <p>The following asset has been assigned to you:</p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Asset:</strong> ${assetName}</li>
                <li><strong>Asset ID:</strong> ${assetId}</li>
                <li><strong>Assigned Date:</strong> ${new Date(assignedDate).toDateString()}</li>
            </ul>
            <p>Please take care of the asset and report any issues to IT/HR.</p>
            <p>Best regards,<br />Your Company Name</p>
        </div>
    `;

    return { subject, html };
};

module.exports = assetAssignHtml;
