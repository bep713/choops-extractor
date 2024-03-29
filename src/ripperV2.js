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
    const defaultLogPath = path.join(outputPath, '_logs', `choops-extractor-output_${Date.now().toString()}.txt`);
    let logOutput = options.logOutput ? options.logOutput : defaultLogPath;

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

    logger.info('*** Choops Extractor v0.5.0 output ***');

    await hashUtil.hashLookupPromise;
    const controller = new ChoopsController(inputPath, options.gameName);

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

    if (options.type) {
        logger.info(`\t- Only extracting certain types of subfiles: "${options.type}"`);
    }

    if (options.rawIff) {
        logger.info(`\t- Raw IFF: Extracting raw, compressed IFF only.`);
    }

    if (options.rawType) {
        logger.info(`\t- Raw type: Extracting raw type. Will not convert to a texture.`);
    }

    logger.info('\n** Reading data from game files **\n');

    mkdir(path.join(outputPath, '_overrides'));

    controller.on('progress', progressHandler);
    await controller.read({
        buildCache: options.cache
    });
    controller.off('progress', progressHandler);

    let counter = 0;
    const textureReader = new ChoopsTextureReader();

    let iffsToRead = [];
    let typesToExtract = Object.keys(IFFType.TYPES).map((type) => {
        return IFFType.TYPES[type];
    });

    if (options.type && options.type.length > 0) {
        const typeCodes = options.type.map((type) => {
            return IFFType.TYPES[type];
        });

        typesToExtract = typesToExtract.filter((type) => {
            return options.type.indexOf(type) >= 0
                || typeCodes.indexOf(type) >= 0;
        });
    }
    
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

            // extract IFFs by default
            const iffBuf = await controller.getFileRawData(iffData.name);
            await fs.writeFile(path.join(outputPath, iffFileName), iffBuf);

            if (!(iff instanceof Buffer)) {
                try {
                    for (const file of iff.file.files) {
                        if (typesToExtract.indexOf(file.type) < 0) {
                            continue;
                        }

                        const fileType = IFFType.typeToString(file.type).toLowerCase();
                        const subfolderName = path.join(folderName, `_${file.name}.${fileType}`);
                        // const textureFolderName = path.join(subfolderName, 'textures');
                        await mkdir(subfolderName);

                        outputRawType();

                        // if (!options.rawType) {
                            if (file.type === IFFType.TYPES.TXTR) {
                                const fileDds = await textureReader.toDDSFromFile(file);
                                if (fileDds) {
                                    await fs.writeFile(path.join(subfolderName, `${file.name}.dds`), fileDds);
                                }
                            }
                            else if (file.type === IFFType.TYPES.SCNE) {
                                const packageController = await iff.getFileController(file.name, IFFType.TYPES.SCNE);
                                // const scneFolderName = path.join(folderName, file.name);
    
                                // if (packageController.file.textures.length > 0) {
                                //     await mkdir(textureFolderName);
                                // }
    
                                for (const texture of packageController.file.textures) {
                                    const fileDds = await textureReader.toDDSFromTexture(texture);
                                    if (fileDds) {
                                        await fs.writeFile(path.join(subfolderName, `${texture.name}.dds`), fileDds);
                                    }
                                }
                            }
                            // else {
                                // outputRawType();
                            // }
                        // }
                        // else {
                            // outputRawType();
                        // }

                        async function outputRawType() {
                            let toolWrapperBuf = Buffer.alloc(0xC + (file.dataBlocks.length * 4));
                            toolWrapperBuf.writeUInt32BE(0x326B546C, 0x0);
                            toolWrapperBuf.writeUInt32BE(toolWrapperBuf.length, 0x4);
                            toolWrapperBuf.writeUInt16BE(file.type, 0x8);
                            toolWrapperBuf.writeUInt16BE(file.dataBlocks.length, 0xA);
                            
                            file.dataBlocks.forEach((dataBlock, index) => {
                                toolWrapperBuf.writeUInt32BE(dataBlock.data.length, 0xC + (index * 4));
                            });

                            let fileDataBlocks = file.dataBlocks.map((block) => {
                                return block.data;
                            });

                            fileDataBlocks.unshift(toolWrapperBuf); // add tool wrapper header to beginning
    
                            await fs.writeFile(path.join(folderName, `${file.name}.${fileType}`), Buffer.concat(fileDataBlocks));
                        }
                    }
                }
                catch (err) {
                    logger.info('' + err);
                }
            }
        }

        counter += 1;
    }
};