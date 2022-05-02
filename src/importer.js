const path = require('path');

const ChoopsController = require('2k-tools/src/controller/ChoopsController');
const ChoopsTextureWriter = require('2k-tools/src/parser/choops/ChoopsTextureWriter');

module.exports = async (pathToGameFiles, iffFileName, subfileName, pathToFile, options) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.read({
        buildCache: options.cache
    });

    let fileToModify = await controller.getFileController(iffFileName);
    let subfile = await fileToModify.getFile(subfileName);

    if (path.extname(pathToFile) === '.dds') {
        const textureWriter = new ChoopsTextureWriter();
        await textureWriter.toFileFromDDSPath(pathToFile, subfile);
    }
    else {
        console.error('Error: currently, only DDS file imports are supported.');
    }

    await controller.repack();
};