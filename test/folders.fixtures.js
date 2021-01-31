function makeFoldersArray() {
    return [
        {
            id: 1,
            name: 'Best Folder'
        },
        {
            id: 2,
            name: 'Another Folder'
        }
    ];
};

function makeMaliciousFolder() {
    const maliciousFolder = {
        id: 911,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>'
    };

    const expectedFolder = {
        ...maliciousFolder,
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;'
    };

    return {
        maliciousFolder,
        expectedFolder
    }
}

module.exports = {
    makeFoldersArray,
    makeMaliciousFolder
}