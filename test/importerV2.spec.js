const path = require('path');
const fs = require('fs/promises');
const expect = require('chai').expect;
const importer = require('../src/importerV2');

const PATH_TO_TEST_DATA = path.join(__dirname, 'data', 'import');
const PATH_TO_OVERRIDES = path.join(PATH_TO_TEST_DATA, '_overrides');

describe('importerV2 tests', () => {
    afterEach(async () => {
        if (await pathExists(PATH_TO_OVERRIDES)) {
            await fs.rm(path.join(PATH_TO_TEST_DATA, '_overrides'), {
                force: true,
                recursive: true,
            });
        }
    });

    it('import entire IFF', async () => {
        const iffToOverride = 's000.iff';

        await importer(PATH_TO_TEST_DATA, path.join(PATH_TO_TEST_DATA, 'entire_iff.iff'), {
            iff: iffToOverride
        });

        const overridesPathExists = await pathExists(PATH_TO_OVERRIDES);
        expect(overridesPathExists).to.be.true;

        const iffOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, iffToOverride));
        expect(iffOverrideExists).to.be.true;
    });

    it('import entire IFF - without .iff', async () => {
        const iffToOverride = 's000';

        await importer(PATH_TO_TEST_DATA, path.join(PATH_TO_TEST_DATA, 'entire_iff.iff'), {
            iff: iffToOverride
        });

        const overridesPathExists = await pathExists(PATH_TO_OVERRIDES);
        expect(overridesPathExists).to.be.true;

        const iffOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, iffToOverride));
        expect(iffOverrideExists).to.be.true;
    });

    it('import subfile', async () => {
        const iffToOverride = 's000.iff';
        const textureToOverride = 'floor_normalglossdetail.txtr';

        await importer(PATH_TO_TEST_DATA, path.join(PATH_TO_TEST_DATA, 'raw_texture.txtr'), {
            iff: iffToOverride,
            sub: textureToOverride
        });

        const overridesPathExists = await pathExists(PATH_TO_OVERRIDES);
        expect(overridesPathExists).to.be.true;

        const iffOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff')));
        expect(iffOverrideExists).to.be.true;

        const subfileOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff'), textureToOverride));
        expect(subfileOverrideExists).to.be.true;
    });

    it('import subfile texture', async () => {
        const iffToOverride = 's000.iff';
        const textureToOverride = 'floor_normalglossdetail.txtr';

        await importer(PATH_TO_TEST_DATA, path.join(PATH_TO_TEST_DATA, 'dds_texture.dds'), {
            iff: iffToOverride,
            sub: textureToOverride
        });

        const overridesPathExists = await pathExists(PATH_TO_OVERRIDES);
        expect(overridesPathExists).to.be.true;

        const iffOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff')));
        expect(iffOverrideExists).to.be.true;

        const subfileFolderOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff'), `_${textureToOverride}`));
        expect(subfileFolderOverrideExists).to.be.true;

        const textureOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff'), 
            `_${textureToOverride}`, `${path.basename(textureToOverride, '.txtr')}.dds`));
        expect(textureOverrideExists).to.be.true;
    });

    it('import SCNE texture', async () => {
        const iffToOverride = 's000.iff';
        const textureToOverride = 'floor.scne/texture_0';

        await importer(PATH_TO_TEST_DATA, path.join(PATH_TO_TEST_DATA, 'dds_texture.dds'), {
            iff: iffToOverride,
            sub: textureToOverride
        });

        const overridesPathExists = await pathExists(PATH_TO_OVERRIDES);
        expect(overridesPathExists).to.be.true;

        const iffOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff')));
        expect(iffOverrideExists).to.be.true;

        const subfileFolderOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff'), `_floor.scne`));
        expect(subfileFolderOverrideExists).to.be.true;

        const textureOverrideExists = await pathExists(path.join(PATH_TO_OVERRIDES, path.basename(iffToOverride, '.iff'), 
            `_floor.scne`, `texture_0.dds`));
        expect(textureOverrideExists).to.be.true;
    });
});

async function pathExists(dir) {
    try {
        await fs.access(dir);
        return true;
    }
    catch (err) {
        return false;
    }
};