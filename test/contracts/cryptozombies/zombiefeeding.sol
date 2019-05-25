pragma solidity ^0.5.8;

import "./zombiefactory.sol";
import "./kittyinterface.sol";


contract ZombieFeeding is ZombieFactory {

    KittyInterface kittyContract;

    modifier onlyOwnerOf(uint _zombieId) {
        require(msg.sender == zombieToOwner[_zombieId], "");
        _;
    }

    function setKittyContractAddress(address _address) external onlyOwner {
        kittyContract = KittyInterface(_address);
    }

    function _triggerCooldown(Zombie storage _zombie) internal {
        _zombie.readyTime = uint32(now + cooldownTime);
    }

    function _isReady(Zombie storage _zombie) internal view returns (bool) {
        return (_zombie.readyTime <= now);
    }

    function feedAndMultiply(uint _zombieId, uint _targetDna, string memory _species) internal onlyOwnerOf(_zombieId) {
        Zombie storage myZombie = zombies[_zombieId];
        require(_isReady(myZombie), "");
        uint targetDna = _targetDna % dnaModulus;
        uint newDna = (myZombie.dna + targetDna) / 2;
        if (keccak256(abi.encodePacked(_species)) == keccak256("kitty")) {
            newDna = newDna - newDna % 100 + 99;
        }
        string memory NoName = "NoName";
        _createZombie(NoName, newDna);
        _triggerCooldown(myZombie);
    }

    function feedOnKitty(uint _zombieId, uint _kittyId) public {
        uint kittyDna;
        // TODO: add again
        // (,,,,,,,,,kittyDna) = kittyContract.getKitty(_kittyId);
        string memory kitty = "kitty";
        feedAndMultiply(_zombieId, kittyDna, kitty);
    }
}
