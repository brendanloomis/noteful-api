const { expect } = require('chai');
const { expectCt } = require('helmet');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeFoldersArray } = require('./folders.fixtures');
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures');

describe('Notes Endpoints', () => {
    let db;
    
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db.raw('TRUNCATE noteful_notes, noteful_folders'));

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders'));

    describe(`Unauthorized requests`, () => {
        const testFolders = makeFoldersArray();
        const testNotes = makeNotesArray();

        beforeEach('insert notes', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db
                        .into('noteful_notes')
                        .insert(testNotes);
                });
        });

        it(`responds with 401 Unauthorized for GET /api/notes`, () => {
            return supertest(app)
                .get('/api/notes')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for POST /api/notes`, () => {
            return supertest(app)
                .post('/api/notes')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for GET /api/notes/:note_id`, () => {
            const note = testNotes[1];
            return supertest(app)
                .get(`/api/notes/${note.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:note_id`, () => {
            const note = testNotes[1];
            return supertest(app)
                .delete(`/api/notes/${note.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for PATCH /api/notes/:note_id`, () => {
            const note = testNotes[1];
            return supertest(app)
                .patch(`/api/notes/${note.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });
    });

    describe(`GET /api/notes`, () => {
        context(`Given no notes`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/notes')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context(`Given there are notes in the database`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
    
            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes);
                    });
            });

            it('responds with 200 and all of the notes', () => {
                return supertest(app)
                    .get('/api/notes')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testNotes);
            });
        });

        context(`Given an XSS attack note`, () => {
            const { maliciousNote, expectedNote } = makeMaliciousNote();

            beforeEach('insert malicious note', () => {
                const testFolders = makeFoldersArray();
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(maliciousNote);
                    });
            });

            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get('/api/notes')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].name).to.eql(expectedNote.name);
                        expect(res.body[0].content).to.eql(expectedNote.content);
                    });
            });
        });
    });

    describe('GET /api/notes/:note_id', () => {
        context(`Given no notes`, () => {
            it(`responds 404 when note doesn't exist`, () => {
                const noteId = 123456;
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    });
            });
        });

        context(`Given there are notes in the database`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
    
            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes);
                    });
            });

            it(`responds with 200 and the specified note`, () => {
                const noteId = 2;
                const expectedNote = testNotes[noteId - 1];

                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedNote);
            });
        });

        context(`Given an XSS attack note`, () => {
            const { maliciousNote, expectedNote } = makeMaliciousNote();

            beforeEach('insert malicious note', () => {
                const testFolders = makeFoldersArray();
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(maliciousNote);
                    });
            });

            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get(`/api/notes/${maliciousNote.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedNote.name);
                        expect(res.body.content).to.eql(expectedNote.content);
                    });
            });
        });
    });

    describe(`DELETE /api/notes/:note_id`, () => {
        context(`Given no notes`, () => {
            it(`responds with 404 when note doesn't exist`, () => {
                return supertest(app)
                    .delete(`/api/notes/123456`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    });
            });
        });

        context(`Given there are notes`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
    
            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes);
                    });
            });

            it(`responds with 204 and removes the note`, () => {
                const idToRemove = 2;
                const expectedNotes = testNotes.filter(n => n.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/api/notes')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedNotes);
                    });
            });
        });
    });

    describe(`POST /api/notes`, () => {
        const testFolders = makeFoldersArray();

        beforeEach('insert folders', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders);
        });

        const requiredFields = ['name', 'folder_id', 'content'];

        requiredFields.forEach(field => {
            const newNote = {
                name: 'Test new note',
                folder_id: 1,
                content: 'Test new note content'
            };

            it (`responds with 400 and an error message when the ${field} is missing`, () => {
                delete newNote[field];

                return supertest(app)
                    .post('/api/notes')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newNote)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body`}
                    });
            });
        });

        it(`creates a note, responding with 201 and the new note`, () => {
            const newNote = {
                name: 'test note',
                folder_id: 1,
                content: 'Test note content'
            };

            return supertest(app)
                .post('/api/notes')
                .send(newNote)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newNote.name);
                    expect(res.body.folder_id).to.eql(newNote.folder_id);
                    expect(res.body.content).to.eql(newNote.content);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
                    const expected = new Date().toLocaleString();
                    const actual = new Date(res.body.modified).toLocaleString();
                    expect(actual).to.eql(expected);
                })
                .then(postRes => {
                    supertest(app)
                        .get(`/api/notes/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body);
                });
        });

        it(`removes XSS attack content from response`, () => {
            const { maliciousNote, expectedNote } = makeMaliciousNote();

            return supertest(app)
                .post('/api/notes')
                .send(maliciousNote)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(expectedNote.name);
                    expect(res.body.content).to.eql(expectedNote.content);
                });
        });
    });

    describe(`PATCH /api/notes/:note_id`, () => {
        context(`Given no notes`, () => {
            it(`responds with 404 when note doesn't exist`, () => {
                return supertest(app)
                    .patch(`/api/notes/123456`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    });
            });
        });

        context(`Given there are notes`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
    
            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes);
                    });
            });

            it.skip(`responds with 204 and updates the note`, () => {
                const idToUpdate = 2;
                const updateNote = {
                    name: 'Updated title',
                    folderId: 2,
                    content: 'updated content'
                };
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote,
                    modified: new Date().toISOString()
                };

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateNote)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedNote)
                    );
            });

            it.skip(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateNote = {
                    name: 'updated name'
                };
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote,
                    modified: new Date().toISOString()
                };

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateNote,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedNote)
                    );
            });
        });
    });
});