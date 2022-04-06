const { program } = require('commander');
const ripper = require('./ripper');

program
    .name('choops-extractor')
    .version('0.1.0')
    .description('A command line utility to extract College Hoops 2k8 (PS3) textures and more.')

program.command('rip')
    .description('Rip all or some of the game files to the specified output directory.')
    .argument('<path to game files>', 'Path to Choops game files directory (must include USRDIR in path)')
    .argument('<output path>', 'Path to output the game files')
    .option('-c, --cache', 'Force cache rebuild')
    .option('-i, --index <number>', 'IFF file to rip (by index)')
    .option('-f, --file <string>', 'IFF file to rip (by name, include .iff on the end)')
    .option('--iff-only', 'Only rip IFFs, do not rip individual files within them')
    .option('--log-output <string>', 'Path to place the output log. Defaults to base output directory')
    .option('--show-console', 'Show the output in the console in addition to creating a log')
    .action(async (inputPath, outputPath, options) => {
        await ripper(inputPath, outputPath, options);
    });
    
(async () => {
    await program.parseAsync(process.argv);
})();