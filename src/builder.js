const fsOld = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const fs = require('fs/promises');

const IFFReader = require('2k-tools/src/parser/IFFReader');
const IFFType = require('2k-tools/src/model/general/iff/IFFType');
const ToolWrappedReader = require('2k-tools/src/parser/ToolWrappedReader');
const ChoopsController = require('2k-tools/src/controller/ChoopsController');
const ChoopsTextureWriter = require('2k-tools/src/parser/choops/ChoopsTextureWriter');

module.exports = async (pathToGameFiles, pathToMod) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.revertAll();
    await controller.read();

    // Find if there are any IFFs at the mod base level
    const contents = await fs.readdir(pathToMod);
    
    for (let content of contents) {
        const contentPath = path.join(pathToMod, content);
        const stat = await fs.lstat(contentPath);

        if (stat.isFile()) {
            if (path.extname(content).toLowerCase() === '.iff') {
                // import entire IFF
                let modIffController = await new Promise((resolve, reject) => {
                    const parser = new IFFReader();
        
                    pipeline(
                        fsOld.createReadStream(contentPath),
                        parser,
                        (err) => {
                            if (err) reject(err);
                            else resolve(parser.controller);
                        }
                    )
                });

                let iffCacheEntry = await controller.getEntryByName(content);
                iffCacheEntry.controller = modIffController;
            }
        }
        else {
            // walk the directory
            const iff = `${content}.iff`;
            const subContents = await fs.readdir(contentPath);

            subContents.sort();
            subContents.reverse();  // Ensure any texture overrides in SCNEs are performed after the subfile replacement

            for (let subContent of subContents) {
                const subContentPath = path.join(contentPath, subContent);

                if (subContent.indexOf('_') === 0) {
                    // import a piece of a subfile - it's a directory
                    const piecesToReplace = await fs.readdir(subContentPath);
                    let subfileName = subContent.substring(1);
                    
                    if (subfileName.indexOf('.') >= 0) {
                        const splitName = subfileName.split('.');
                        subfileName = splitName[0];
                        type = IFFType.TYPES[splitName[1].toUpperCase()];
                    }

                    let iffController = await controller.getFileController(iff);
                    let subfileController = await iffController.getFileController(subfileName, type);

                    for (let piece of piecesToReplace) {
                        const piecePath = path.join(subContentPath, piece);                        
                        
                        if (path.extname(piecePath) !== '.dds') {
                            console.error('Error: currently, only DDS file imports are supported.');
                        }
                        
                        const textureWriter = new ChoopsTextureWriter();
                        const packageFileName = path.basename(piece, '.dds');

                        if (packageFileName === subfileName) {
                            // TXTR
                            await textureWriter.toFileFromDDSPath(piecePath, subfileController);
                        }
                        else {
                            // SCNE
                            const packageFile = subfileController.getTextureByName(packageFileName);
    
                            if (packageFile) {
                                await textureWriter.toPackageFileFromDDSPath(piecePath, packageFile);
                            }
                            else {
                                console.error(`Error: Cannot find a package file named "${packageFileName}" in ${subfileName}.`);
                            }
                        }
                    }
                }
                else {
                    // import entire subfile
                    let subfileName = subContent;
                    
                    if (subfileName.indexOf('.') >= 0) {
                        const splitName = subfileName.split('.');
                        subfileName = splitName[0];
                        type = IFFType.TYPES[splitName[1].toUpperCase()];
                    }

                    let iffController = await controller.getFileController(iff);
                    let subfileController = await iffController.getFileRawData(subfileName, type);

                    const toolWrappedReader = new ToolWrappedReader();
                    const wrappedFile = await new Promise((resolve, reject) => {
                        pipeline(
                            fsOld.createReadStream(subContentPath),
                            toolWrappedReader,
                            (err) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(toolWrappedReader.file);
                                }
                            }
                        )
                    });

                    if (wrappedFile.numberOfBlocks !== subfileController.dataBlocks.length) {
                        console.warn(`WARNING: ${iff} - Data block lengths differ - cannot replace file. 
                        Original: ${subfileController.dataBlocks.length}, New: ${wrappedFile.numberOfBlocks}. Skipping this file.`);
                    }
                    else {
                        wrappedFile.blocks.forEach((block, index) => {
                            subfileController.dataBlocks[index].data = block;
                            subfileController.dataBlocks[index].length = block.length;
                        });
                    }
                }
            }
        }
    }

    await controller.repack();
};