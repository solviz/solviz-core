pragma solidity ^0.5.0;

contract Data {

    struct MNFT {
        string name;
        uint8 category;
    }
    MNFT[] internal nfts;

    mapping(address => uint256) internal changes;
    mapping(address => uint256) internal allowed;
}
