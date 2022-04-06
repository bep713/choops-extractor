## Choops Extractor

### Instructions
1. Download the file from the releases page on here.
2. Use 7-zip to extract it somewhere. You'll see two files: choops-extractor.exe and gtf2dds.exe
3. Open a command prompt and type `choops-extractor.exe rip <path to game files up till USRDIR> <path to output>`
4. It will take awhile, it will build a cache and then go through each IFF one by one to extract the contents.

### Usage
By default, the tool will extract all files within the IFFs. It will automatically convert the textures to DDS format.

#### Help
If you want to get documentation on any of the options from the command prompt, use `choops-extractor.exe help` or `choops-extractor.exe help rip`

#### IFF Only
If you do not want to extract the sub-files, you can add `--iff-only` to the command prompt and it will extract the full .iff file without any textures.

#### Index
If you know which index you want to extract, you can use `-i <index>`. The index must be a number. It will extract the IFF file at <index> in the game files.

#### File
If you only want to extract one IFF file, you can use `-f <name>`. This will ONLY extract the IFF file with the <name> specified. You have to include .iff on the end of the name.

#### Cache
If you want to force re-build the cache, use `-c`

#### Log output
If you want to customize where to put the log output, use `--log-output <logPath>`. By default, the log is placed in the output directory.

#### Show console
If you want to show the log in the console in addition to the log file, use `--show-console`.
