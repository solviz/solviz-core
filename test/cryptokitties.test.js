const assert = require('assert').strict;


const { parsing } = require('../src/parsing');

const KittyBaseExpected = require('./KittyBase.json');
const KittyOwnershipExpected = require('./KittyOwnership.json');
const KittyBreedingExpected = require('./KittyBreeding.json');
const KittyAuctionExpected = require('./KittyAuction.json');
const KittyMintingExpected = require('./KittyMinting.json');
const KittyCoreExpected = require('./KittyCore.json');


describe('CryptoKitties', () => {
    it('parse KittieBase.sol', () => {
        const KittieBaseParsed = parsing(['./test/contracts/cryptokitties/KittyBase.sol']);
        assert.deepStrictEqual(KittieBaseParsed, KittyBaseExpected);
    });
    it('parse KittyOwnership.sol', () => {
        const KittyOwnershipParsed = parsing(['./test/contracts/cryptokitties/KittyOwnership.sol']);
        assert.deepStrictEqual(KittyOwnershipParsed, KittyOwnershipExpected);
    });
    it('parse KittyBreeding.sol', () => {
        const KittyBreedingParsed = parsing(['./test/contracts/cryptokitties/KittyBreeding.sol']);
        assert.deepStrictEqual(KittyBreedingParsed, KittyBreedingExpected);
    });
    it('parse KittyAuction.sol', () => {
        const KittyAuctionParsed = parsing(['./test/contracts/cryptokitties/KittyAuction.sol']);
        assert.deepStrictEqual(KittyAuctionParsed, KittyAuctionExpected);
    });
    it('parse KittyMinting.sol', () => {
        const KittyMintingParsed = parsing(['./test/contracts/cryptokitties/KittyMinting.sol']);
        assert.deepStrictEqual(KittyMintingParsed, KittyMintingExpected);
    });
    it('parse KittyCore.sol', () => {
        const KittyCoreParsed = parsing(['./test/contracts/cryptokitties/KittyCore.sol']);
        assert.deepStrictEqual(KittyCoreParsed, KittyCoreExpected);
    });
});
