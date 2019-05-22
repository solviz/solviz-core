const { expect } = require('chai');

const { parsing } = require('../src/parsing');

describe('Aircraft', () => {
    it('simple method calling another method', () => {
        const expectedResult = [
            {
                file: './test/contracts/noExternal/Aircraft.sol',
                edge: [
                    {
                        name: 'Aircraft:setDriver:address',
                        size: 3938,
                        imports: [
                            'Aircraft:isDriver:address',
                        ],
                    },
                    {
                        name: 'Aircraft:isDriver:address',
                        size: 3938,
                        imports: [],
                    },
                ],
                neural: {
                    nodes: [
                        {
                            id: 'Aircraft:setDriver:address',
                            method: 'setDriver',
                            contract: 'Aircraft',
                        },
                        {
                            id: 'Aircraft:isDriver:address',
                            method: 'isDriver',
                            contract: 'Aircraft',
                        },
                    ],
                    links: [
                        {
                            source: 'Aircraft:setDriver:address',
                            target: 'Aircraft:isDriver:address',
                            value: 1,
                        },
                    ],
                },
            },
        ];
        expect(
            JSON.stringify(parsing(['./test/contracts/noExternal/Aircraft.sol'])),
        ).to.be.equal(
            JSON.stringify(expectedResult),
        );
    });
});

describe('cryptozombies', () => {
    it('zombiefactory', () => {
        const expectedResult = [
            {
                file: './test/contracts/cryptozombies/zombiefactory.sol',
                edge: [
                    {
                        name: 'ZombieFactory:_createZombie:string:uint',
                        size: 3938,
                        imports: [],
                    },
                    {
                        name: 'ZombieFactory:_generateRandomDna:string',
                        size: 3938,
                        imports: [],
                    },
                    {
                        name: 'ZombieFactory:createRandomZombie:string',
                        size: 3938,
                        imports: [
                            'ZombieFactory:_generateRandomDna:string',
                            'ZombieFactory:_createZombie:string:uint',
                        ],
                    },
                ],
                neural: {
                    nodes: [
                        {
                            id: 'ZombieFactory:_createZombie:string:uint',
                            method: '_createZombie',
                            contract: 'ZombieFactory',
                        },
                        {
                            id: 'ZombieFactory:_generateRandomDna:string',
                            method: '_generateRandomDna',
                            contract: 'ZombieFactory',
                        },
                        {
                            id: 'ZombieFactory:createRandomZombie:string',
                            method: 'createRandomZombie',
                            contract: 'ZombieFactory',
                        },
                    ],
                    links: [
                        {
                            source: 'ZombieFactory:createRandomZombie:string',
                            target: 'ZombieFactory:_generateRandomDna:string',
                            value: 1,
                        },
                        {
                            source: 'ZombieFactory:createRandomZombie:string',
                            target: 'ZombieFactory:_createZombie:string:uint',
                            value: 1,
                        },
                    ],
                },
            },
        ];
        const result = parsing(['./test/contracts/cryptozombies/zombiefactory.sol']);
        for (let n = 0; n < expectedResult[0].neural.nodes.length; n += 1) {
            expect(
                expectedResult[0].neural.nodes,
            ).to.deep.include(
                result[0].neural.nodes[n],
            );
        }
    });
});
