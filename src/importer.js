const path = require('path');

const ChoopsController = require('2k-tools/src/controller/ChoopsController');
const ChoopsTextureWriter = require('2k-tools/src/parser/choops/ChoopsTextureWriter');

module.exports = async (pathToGameFiles, iffFileName, subfileName, pathToFile, options) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.read({
        buildCache: options.cache
    });

    let fileToModify = await controller.getFileController(iffFileName);

    let packageFileName = '';

    if (subfileName.indexOf('/') >= 0) {
        const splitName = subfileName.split('/');
        subfileName = splitName[0];
        packageFileName = splitName[1];
    }

    let subfile = await fileToModify.getFileController(subfileName);

    if (path.extname(pathToFile) !== '.dds') {
        console.error('Error: currently, only DDS file imports are supported.');
    }

    const textureWriter = new ChoopsTextureWriter();

    if (packageFileName) {
        // SCNE texture
        const packageFile = subfile.getTextureByName(packageFileName);

        if (packageFile) {
            await textureWriter.toPackageFileFromDDSPath(pathToFile, packageFile);
        }
        else {
            console.error(`Error: Cannot find a package file named "${packageFileName}" in ${subfileName}.`);
        }
    }
    else {
        // Regular texture
        await textureWriter.toFileFromDDSPath(pathToFile, subfile);
    }

    await controller.repack();
};