const allUsersEmailHTML = async (body) => {
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>${body}</p>
        </div>
    `;

    return { html };
};

module.exports = allUsersEmailHTML;
