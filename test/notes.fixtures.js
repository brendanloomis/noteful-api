function makeNotesArray() {
    return [
        {
            id: 1,
            name: 'Dogs',
            modified: '2029-01-22T16:28:32.615Z',
            folder_id: 1,
            content: 'Dogs are cool'
        },
        {
            id: 2,
            name: 'Cats',
            modified: '2100-05-22T16:28:32.615Z',
            folder_id: 1,
            content: 'Cats are cute'
        },
        {
            id: 3,
            name: 'Woo',
            modified: '1919-12-22T16:28:32.615Z',
            folder_id: 2,
            content: 'WOOOOOOO'
        },
        {
            id: 4,
            name: 'Ahh',
            modified: '1919-12-22T16:28:32.615Z',
            folder_id: 2,
            content: 'AAAAHHHHH'
        }
    ];
};

function makeMaliciousNote() {
    const maliciousNote = {
        id: 911,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        modified: new Date().toISOString(),
        folder_id: 1,
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    };

    const expectedNote = {
        ...maliciousNote,
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }

    return {
        maliciousNote,
        expectedNote
    };
}

module.exports = {
    makeNotesArray,
    makeMaliciousNote
};