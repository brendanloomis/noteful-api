const path = require('path');
const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const NotesService = require('./notes-service');
const { json } = require('express');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    modified: note.modified,
    folder_id: note.folder_id,
    content: xss(note.content)
});

notesRouter
    .route('/')
    .get((req, res, next) => {
        NotesService.getAllNotes(
            req.app.get('db')
        )
            .then(notes => {
                res.json(notes.map(serializeNote));
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const { name, folder_id, content } = req.body;
        const newNote = { name, folder_id, content };

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                logger.error(`'${key}' is required`);
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                });
            }
        }

        NotesService.insertNote(
            req.app.get('db'),
            newNote
        )
            .then(note => {
                logger.info(`Note with id ${note.id} created.`);
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    .json(serializeNote(note));
            })
            .catch(next);
    });

notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        const { note_id } = req.params;

        NotesService.getById(
            req.app.get('db'),
            note_id
        )
            .then(note => {
                if (!note) {
                    logger.error(`Note with id ${note_id} not found.`);
                    return res.status(404)
                        .json({
                            error: { message: `Note doesn't exist` }
                        });
                }
                res.note = note;
                next();
            })
            .catch(next);
    })
    .get((req, res) => {
        res.json(serializeNote(res.note));
    })
    .delete((req, res, next) => {
        const { note_id } = req.params;

        NotesService.deleteNote(
            req.app.get('db'),
            note_id
        )
            .then(() => {
                logger.info(`Note with id ${note_id} deleted.`);
                res.status(204).end();
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const { name, folder_id, content } = req.body;
        const noteToUpdate = { name, folder_id, content };

        const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            logger.error(`Invalid update without required fields`);
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'name', 'folder_id', or 'content'`
                }
            });
        }

        noteToUpdate.modified = new Date();

        NotesService.updateNote(
            req.app.get('db'),
            req.params.note_id,
            noteToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end();
            })
            .catch(next);
    })

module.exports = notesRouter;