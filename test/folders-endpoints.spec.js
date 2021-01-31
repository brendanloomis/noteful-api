const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');

describe('Folders Endpoints', () => {
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

        beforeEach('insert folders', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders);
        });

        it(`responds with 401 Unauthorized for GET /api/folders`, () => {
            return supertest(app)
                .get('/api/folders')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for POST /api/folders`, () => {
            return supertest(app)
                .post('/api/folders')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for GET /api/folders/:folder_id`, () => {
            const secondFolder = testFolders[1];
            return supertest(app)
                .get(`/api/folders/${secondFolder.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for DELETE /api/folders/:folder_id`, () => {
            const folder = testFolders[1];
            return supertest(app)
                .delete(`/api/folders/${folder.id}`)
                .expect(401, {error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for PATCH /api/folders/:folder_id`, () => {
            const folder = testFolders[1];
            return supertest(app)
                .patch(`/api/folders/${folder.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });
    });

    describe('GET /api/folders', () => {
        context(`Given no folders`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context(`Given there are bookmarks in the database`, () => {
            const testFolders = makeFoldersArray();

            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders);
            });

            it('responds with 200 and all of the folders', () => {
                return supertest(app)
                    .get('/api/folders')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testFolders);
            });
        });

        context(`Given an XSS attack folder`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            beforeEach('insert malicious folder', () => {
                return db   
                    .into('noteful_folders')
                    .insert([maliciousFolder]);
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/folders')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].name).to.eql(expectedFolder.name);
                    });
            });
        });
    });

    describe(`GET /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404 when folder doesn't exist`, () => {
                const folderId = 123456;
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: {
                            message: `Folder doesn't exist`
                        }
                    });
            });
        });

        context(`Given there are folders in the database`, () => {
            const testFolders = makeFoldersArray();

            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders);
            });

            it('responds with 200 and the specified folder', () => {
                const folderId = 2;
                const expectedFolder = testFolders[folderId - 1];

                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedFolder);
            });
        });

        context(`Given an XSS attack folder`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            beforeEach('insert malicious folder', () => {
                return db
                    .into('noteful_folders')
                    .insert([maliciousFolder]);
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/folders/${maliciousFolder.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedFolder.name);
                    });
            });
        });
    });

    describe(`DELETE /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404 when folder doesn't exist`, () => {
                return supertest(app)
                    .delete(`/api/folders/123456`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Folder doesn't exist` }
                    });
            });
        });

        context(`Given there are folders`, () => {
            const testFolders = makeFoldersArray();

            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders);
            });

            it(`responds with 204 and removes folder`, () => {
                const idToRemove = 2;
                const expectedFolders = testFolders.filter(f => f.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/folders/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/api/folders')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedFolders);
                    });
            });
        });
    });

    describe('POST /api/folders', () => {

        it(`responds with 400 and an error message when the name is missing`, () => {
            const newFolder = {
                name: ''
            };

            return supertest(app)
                .post('/api/folders')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newFolder)
                .expect(400, {
                    error: { message: `Missing 'name' in request body` }
                });
        });

        it(`creates a folder, responding with 201 and the new folder`, () => {
            const newFolder = {
                name: 'Test Folder'
            };

            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newFolder.name);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
                })
                .then(postRes => {
                    supertest(app)
                        .get(`/api/folders/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body);
                });
        });

        it(`removes XSS attack content from response`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            return supertest(app)
                .post('/api/folders')
                .send(maliciousFolder)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(expectedFolder.name);
                });
        });
    });

    describe(`PATCH /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderId = 123456;
                return supertest(app)
                    .patch(`/api/folders/${folderId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: {message: `Folder doesn't exist` } });
            });
        });

        context(`Given there are folders in the database`, () => {
            const testFolders = makeFoldersArray();

            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders);
            });

            it(`responds with 204 and updates the folder`, () => {
                const idToUpdate = 2;
                const updateFolder = {
                    name: 'Update name'
                };
                const expectedFolder = {
                    ...testFolders[idToUpdate -1],
                    ...updateFolder
                };

                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateFolder)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedFolder);
                    });
            });

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain 'name'`
                        }
                    });
            });
        });
    });
});