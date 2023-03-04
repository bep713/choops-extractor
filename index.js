const { program } = require('commander');

const cache = require('./src/cache');
const ripper = require('./src/ripperV2');
const importer = require('./src/importerV2');
const reverter = require('./src/reverter');
const builder = require('./src/builder');

program
    .name('choops-extractor')
    .version('0.5.3')
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
    .description('Import a file to the mod overrides (does not alter the game files!)')
    .argument('<path to mod directory>', 'Path to mod directory')
    .argument('<path to file>', 'Path to the file to import')
    .option('-iff, iff <iff file name>', 'Name of the IFF file to modify')
    .option('-sub, sub <subfile name>', 'Name of the subfile to modify. If importing a SCNE texture, subfile name should include both '
        + 'SCNE and texture name (without .DDS at the end), separated with a "/". Ex: arena/texture_0')
    .action(async (pathToModDirectory, pathToFile, options) => {
        await importer(pathToModDirectory, pathToFile, options);
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

program.command('build')
    .description('Build mods and alter the game files (do not do this while the game is active)')
    .argument('<path to game files>', 'Path to the game files to modify')
    .argument('<path to mod files>', 'Path to the mod')
    .action(async (pathToGameFiles, pathToMod) => {
        await builder(pathToGameFiles, pathToMod);
    });

(async () => {
    await program.parseAsync(process.argv);
})();