const { program } = require('commander');

const cache = require('./src/cache');
const ripper = require('./src/ripper');
const importer = require('./src/importer');
const reverter = require('./src/reverter');

program
    .name('choops-extractor')
    .version('0.4.1')
    .description('A command line utility to extract College Hoops 2k8 (PS3) textures and more.')

program.command('rip')
    .description('Rip all or some of the game files to the specified output directory.')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .argument('<output path>', 'Path to output the game files')
    .option('-c, --cache', 'Force cache rebuild')
    .option('-i, --index <number>', 'IFF file to rip (by index)')
    .option('-f, --file <string>', 'IFF file to rip (by name, include .iff on the end)')
    .option('--iff-only', 'Only rip IFFs, do not rip individual files within them')
    .option('--raw-iff', 'Do not decompress the IFF. Rip it as-is.')
    .option('--log-output <string>', 'Path to place the output log. Defaults to base output directory')
    .option('--show-console', 'Show the output in the console in addition to creating a log')
    .option('--type <types...>', 'Only output files of certain type(s). Accepts multiple inputs separated by a space. '
        + 'Supported types: UNKNOWN, TXTR, SCNE, AUDO, LAYT, MRKS, PRIV, TXT, DRCT, CLTH, AMBO, HILT, NAME, CDAN')
    .option('--raw-type', 'Output the subfile as it is in the IFF. Will not process the type (Ex: Textures will not output as DDS).')
    .action(async (inputPath, outputPath, options) => {
        await ripper(inputPath, outputPath, options);
    });

program.command('build-cache')
    .description('Forces a cache build.')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .action(async (pathToGameFiles, options) => {
        await cache(pathToGameFiles, options);
    });

program.command('import')
    .description('Import a file modify the game files')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .argument('<iff file name>', 'Name of the IFF file to modify')
    .argument('<subfile name>', 'Name of the subfile to modify. If importing a SCNE texture, subfile name should include both '
        + 'SCNE and texture name (without .DDS at the end), separated with a "/". Ex: arena/texture_0')
    .argument('<path to file>', 'Path to the file to import')
    .option('-c, --cache', 'Force cache rebuild')
    .action(async (pathToGameFiles, iffFileName, subfileName, pathToFile, options) => {
        await importer(pathToGameFiles, iffFileName, subfileName, pathToFile, options);
    });

program.command('revert')
    .description('Revert a file (warning: cannot be undone!)')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .argument('<iff file name>', 'Name of the IFF file to revert')
    .action(async (pathToGameFiles, iffFileName, options) => {
        await reverter.revertFile(pathToGameFiles, iffFileName, options);
    });

program.command('revert-all')
    .description('Revert the entire game archive (warning: cannot be undone!)')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .action(async (pathToGameFiles, options) => {
        await reverter.revertAll(pathToGameFiles, options);
    });

(async () => {
    await program.parseAsync(process.argv);
})();