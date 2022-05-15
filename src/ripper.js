const fsBase = require('fs');
const path = require('path');
const fs = require('fs/promises');
const mkdir = require('make-dir');
const { pipeline } = require('stream');
const { createLogger, format, transports } = require('winston');

const IFFWriter = require('2k-tools/src/parser/IFFWriter');
const IFFType = require('2k-tools/src/model/general/iff/IFFType');
const ChoopsController = require('2k-tools/src/controller/ChoopsController');
const ChoopsTextureReader = require('2k-tools/src/parser/choops/ChoopsTextureReader');

const hashUtil = require('2k-tools/src/util/2kHashUtil');

module.exports = async (inputPath, outputPath, options) => {
    let logOutput = options.logOutput ? options.logOutput : path.join(outputPath, `choops-extractor-output_${Date.now().toString()}.txt`);

    const loggerFormat = format.combine(
        format.colorize(),
        format.printf(
            (info) => {
                return `${info.message}`;
            }
        )
    );

    const logger = createLogger({
        level: 'info',
        format: loggerFormat,
        transports: [
            new transports.File({ filename: logOutput, options: { flags: 'w' } })
        ]
    });

    if (options.showConsole) {
        logger.add(new transports.Console({
            format: loggerFormat
        }));
    }

    logger.info('*** Choops Extractor v0.1 output ***');

    await hashUtil.hashLookupPromise;
    const controller = new ChoopsController(inputPath);

    const progressHandler = (data) => {
        logger.info(data.message);
    }

    if (options.iffOnly) {
        logger.info('\t- Reading and ripping IFF files only.');
    }

    if (options.file) {
        logger.info(`\t- Reading and ripping IFFs named "${options.file}"`);
    }

    if (options.index) {
        logger.info(`\t- Reading and ripping the IFF at index "${options.index}"`);
    }

    logger.info('\n** Reading data from game files **\n');

    controller.on('progress', progressHandler);
    await controller.read({
        buildCache: options.cache
    });
    controller.off('progress', progressHandler);

    let counter = 0;
    const textureReader = new ChoopsTextureReader();

    let iffsToRead = [];
    
    if (options.index) {
        iffsToRead.push(controller.data[parseInt(options.index)]);
    }
    else if (options.file) {
        iffsToRead = controller.data.filter((iff) => {
            return iff.name === options.file;
        });
    }
    else {
        iffsToRead = controller.data;
    }

    logger.info('\n** Reading IFFs **\n');

    for (const iffData of iffsToRead) {
        logger.info(`${counter} - ${iffData.name} (NameHash=${iffData.nameHash.toString(16).padStart(8, '0')}, GameFileIndex=${iffData.location}, GameFileOffset=${iffData.offset.toString(16)})`);
        
        const iffDataName = iffData.name.indexOf('.') >= 0 ? iffData.name.slice(0, iffData.name.length - 4) : iffData.name;
        const iffFileName = iffData.name.indexOf('.') >= 0 ? iffData.name : `${iffData.name}.iff`;
        const folderName = path.join(outputPath, iffDataName);
        await mkdir(folderName);

        if (options.iffOnly) {
            if (options.rawIff) {
                const iffBuf = await controller.getFileRawData(iffData.name);
                await fs.writeFile(path.join(folderName, iffFileName), iffBuf);
            }
            else {
                const iff = await controller.getFileController(iffData.name);
    
                await new Promise((resolve, reject) => {
                    pipeline(
                        new IFFWriter(iff.file).createStream(),
                        fsBase.createWriteStream(path.join(folderName, iffFileName)),
                        (err) => {
                            if (err) reject(err);
                            resolve();
                        }
                    )
                });
            }
        }
        else {
            const iff = await controller.getFileController(iffData.name);

            if (!(iff instanceof Buffer)) {
                try {
                    for (const file of iff.file.files) {
                        if (file.type === IFFType.TYPES.TXTR) {
                            const fileDds = await textureReader.toDDSFromFile(file);
                            if (fileDds) {
                                await fs.writeFile(path.join(folderName, `${file.name}.dds`), fileDds);
                            }
                        }
                        else if (file.type === IFFType.TYPES.SCNE) {
                            const packageController = await iff.getFileController(file.name);
                            const scneFolderName = path.join(folderName, file.name);

                            if (packageController.file.textures.length > 0) {
                                await mkdir(scneFolderName);
                            }

                            for (const texture of packageController.file.textures) {
                                const fileDds = await textureReader.toDDSFromTexture(texture);
                                if (fileDds) {
                                    await fs.writeFile(path.join(scneFolderName, `${texture.name}.dds`), fileDds);
                                }
                            }
                        }
                        else {
                            let fileData = Buffer.concat(file.dataBlocks.map((block) => {
                                return block.data;
                            }));
    
                            await fs.writeFile(path.join(folderName, `${file.name}.${IFFType.typeToString(file.type)}`), fileData);
                        }
                    }
                }
                catch (err) {
                    logger.info(err);
                }
            }
            else {
                await fs.writeFile(path.join(folderName, `${iffData.name}`), iff);
            }
        }

        counter += 1;
    }
};