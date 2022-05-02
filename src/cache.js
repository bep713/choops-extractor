const ChoopsController = require('2k-tools/src/controller/ChoopsController');

module.exports = async (pathToGameFiles) => {
    const controller = new ChoopsController(pathToGameFiles);
    await controller.read({
        buildCache: true
    });
};