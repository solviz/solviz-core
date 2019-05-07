pragma solidity ^0.5.0;

import './Data.sol';
import './Allow.sol';

contract Helper is Data {

    function incrementChanges() public {
        changes[msg.sender] += 1;
    }

    function getTotalChanges() public view returns(uint256) {
        return changes[msg.sender];
    }

    function rename(uint256 _token, string memory _name) public {
        MNFT memory nft = nfts[_token];
        nft.name = _name;
        nfts[_token] = nft;
        incrementChanges();
        uint256 total = getTotalChanges();
        allowed[msg.sender] = Allow.updateLimits(total);
    }
}
