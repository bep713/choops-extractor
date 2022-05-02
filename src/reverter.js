const ChoopsController = require('2k-tools/src/controller/ChoopsController');

module.exports.revertFile = async (pathToGameFiles, iffFile) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.read({
        buildCache: false
    });

    await controller.revert(iffFile);
    await controller.repack();
};

module.exports.revertAll = async (pathToGameFiles) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.read({
        buildCache: false
    });

    await controller.revertAll();
};