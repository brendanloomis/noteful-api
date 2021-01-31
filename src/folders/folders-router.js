const path = require('path');
const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const FoldersService = require('./folders-service');

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
    id: folder.id,
    name: xss(folder.name)
});

foldersRouter
    .route('/')
    .get((req, res, next) => {
        FoldersService.getAllFolders(
            req.app.get('db')
        )
            .then(folders => {
                res.json(folders.map(serializeFolder));
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { name } = req.body;
        const newFolder = { name };

        if (!name) {
            logger.error(`Name is required`);
            return res.status(400).send({
                error: { message: `Missing 'name' in request body` }
            });
        }

        FoldersService.insertFolder(
            req.app.get('db'),
            newFolder
        )
            .then(folder => {
                logger.info(`Folder with id ${folder.id} created.`);
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                    .json(serializeFolder(folder));
            })
            .catch(next);
    });

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        const { folder_id } = req.params;

        FoldersService.getById(
            req.app.get('db'),
            folder_id
        )
            .then(folder => {
                if (!folder) {
                    logger.error(`Folder with id ${folder_id} not found.`);
                    return res.status(404).json({
                        error: { message: `Folder doesn't exist`}
                    });
                }
                res.folder = folder;
                next();
            })
            .catch(next);
    })
    .get((req, res) => {
        res.json(serializeFolder(res.folder));
    })
    .delete((req, res, next) => {
        const { folder_id } = req.params;
        
        FoldersService.deleteFolder(
            req.app.get('db'),
            folder_id
        )
            .then(() => {
                logger.info(`Folder with id ${folder_id} deleted.`);
                res.status(204).end();
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const { name } = req.body;
        const folderToUpdate = { name };
        const { folder_id } = req.params;

        if (!name) {
            logger.error(`Invalid update without required fields`);
            return res.status(400).json({
                error: {
                    message: `Request body must contain 'name'`
                }
            });
        }

        FoldersService.updateFolder(
            req.app.get('db'),
            folder_id,
            folderToUpdate
        )
            .then(numRowsAffected => {
                logger.info(`Folder with id ${folder_id} updated`);
                res.status(204).end();
            })
            .catch(next);
    });

module.exports = foldersRouter;