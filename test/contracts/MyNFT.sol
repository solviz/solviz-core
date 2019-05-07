pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol';
import './Helper.sol';
import './Data.sol';
import './Allow.sol';

contract MyNFT is ERC721Full, ERC721Mintable, Data, Helper {

    constructor() ERC721Full("MyNFT", "MNFT") public {
    }

    function orderNewNFT(uint8 _category) public {
        uint256 nft = nfts.push(MNFT("", _category)) - 1;
        _mint(msg.sender, nft);
    }
}
