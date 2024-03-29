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

                logFileReplacement(content, contentPath);
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

                    if (!subfileController) {
                        console.error(`Error: Cannot find a subfile named "${subfileName}" in ${iff}. Skipping this file.`);
                        continue;
                    }

                    for (let piece of piecesToReplace) {
                        const piecePath = path.join(subContentPath, piece);                        
                        
                        if (path.extname(piecePath) === '.gtf') {
                            const textureWriter = new ChoopsTextureWriter();
                            const packageFileName = path.basename(piece, '.gtf');
                            const gtfData = await fs.readFile(piecePath);

                            if (packageFileName === subfileName) {
                                // TXTR
                                await textureWriter.toFileFromGtf(gtfData, subfileController);
                                logFileReplacement(`${iff}/${subfileName}`, piecePath);
                            }
                            else {
                                // SCNE
                                const packageFile = subfileController.getTextureByName(packageFileName);
        
                                if (packageFile) {
                                    await textureWriter.toPackageFileFromGtf(gtfData, packageFile);
                                    logFileReplacement(`${iff}/${subfileName}/${packageFileName}`, piecePath);
                                }
                                else {
                                    console.error(`Error: Cannot find a package file named "${packageFileName}" in ${subfileName}. Skipping this file.`);
                                    continue;
                                }
                            }
                        }
                        else if (path.extname(piecePath) === '.dds') {
                            const textureWriter = new ChoopsTextureWriter();
                            const packageFileName = path.basename(piece, '.dds');

                            if (packageFileName === subfileName) {
                                // TXTR
                                await textureWriter.toFileFromDDSPath(piecePath, subfileController);
                                logFileReplacement(`${iff}/${subfileName}`, piecePath);
                            }
                            else {
                                // SCNE
                                const packageFile = subfileController.getTextureByName(packageFileName);
        
                                if (packageFile) {
                                    await textureWriter.toPackageFileFromDDSPath(piecePath, packageFile);
                                    logFileReplacement(`${iff}/${subfileName}/${packageFileName}`, piecePath);
                                }
                                else {
                                    console.error(`Error: Cannot find a package file named "${packageFileName}" in ${subfileName}. Skipping this file.`);
                                    continue;
                                }
                            }
                        }
                        else {
                            console.error('Error: currently, only DDS or GTF file imports are supported. Skipping this file.');
                            continue;
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
                        logFileReplacement(`${iff}/${subfileName}`, subContentPath);

                        wrappedFile.blocks.forEach((block, index) => {
                            subfileController.dataBlocks[index].data = block;
                            subfileController.dataBlocks[index].length = block.length;
                        });
                    }
                }
            }
        }
    }

    console.log('Import Complete.\n\nRepacking files...This may take awhile.');
    await controller.repack(false);
    console.log('Repacking Complete.');
};

function logFileReplacement(file, replacementPath) {
    console.log(`${file} : ${replacementPath}`);
};