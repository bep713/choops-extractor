const path = require('path');
const fs = require('fs/promises');
const mkdir = require('make-dir');

const IFFType = require('2k-tools/src/model/general/iff/IFFType');

module.exports = async (pathToModDirectory, pathToFile, options) => {
    // importer will take a file from file system and put it in the correct overrides
    
    const overridesPath = path.join(pathToModDirectory, '_overrides');
    // make the mod directory if it doesnt exist
    await mkdir(overridesPath);

    if (options.iff) {
        if (!options.sub) {
            // if user did not specify a subfile, they want to override an entire IFF
            if (path.extname(pathToFile).toLowerCase() !== '.iff') {
                console.warn(`WARNING: Overriding ${options.iff} with a non-IFF file. Proceed with caution.`);
            }
            
            await fs.copyFile(pathToFile, path.join(overridesPath, options.iff));
        }

        else {
            const iffNameWithoutExtension = path.basename(options.iff, '.iff');
            const iffOverridePath = path.join(overridesPath, iffNameWithoutExtension);
            await mkdir(iffOverridePath);

            // if user specifies a subfile, they want to override the subfile or a texture within it.
            let subfileName = options.sub;
            let packageFileName = '';
            let subfileExt = '';
            let iffType = '';

            if (options.sub.indexOf('/') >= 0) {
                const splitName = subfileName.split('/');
                subfileName = splitName[0];
                packageFileName = splitName[1];
            }
        
            if (options.sub.indexOf('.') >= 0) {
                const splitName = subfileName.split('.');
                subfileName = splitName[0];
                subfileExt = splitName[1].toLowerCase();
                iffType = IFFType.TYPES[splitName[1].toUpperCase()];
            }
            else {
                throw new Error('subfile must contain extension. Example: floor.txtr');
            }

            if (path.extname(pathToFile).toLowerCase() === `.${subfileExt.toLowerCase()}`) {
                await fs.copyFile(pathToFile, path.join(iffOverridePath, `${subfileName}.${subfileExt}`));
            }
            else {
                // if the file is a package and user specified a particular package file to import, assume
                // they want to override a texture
                // user wants to override a specific texture
                const subfilePath = path.join(iffOverridePath, `_${subfileName}.${subfileExt.toLowerCase()}`);
                await mkdir(subfilePath);

                if (packageFileName) {
                    await fs.copyFile(pathToFile, path.join(subfilePath, `${packageFileName}${path.extname(pathToFile)}`));
                }
                else {
                    if (subfileExt.toLowerCase() !== 'txtr') {
                        console.warn('WARNING: You are replacing a non-TXTR with a DDS and did not specify a sub-texture in the -sub option (Ex: ...scne/texture_0). Proceed with caution.')
                    }
                    await fs.copyFile(pathToFile, path.join(subfilePath, `${subfileName}${path.extname(pathToFile)}`));
                }
            }
        }
    }
};