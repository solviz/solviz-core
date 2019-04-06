pragma solidity ^0.5.0;

library Allow {
    function updateLimits(uint256 _totalChanges) public pure returns(uint256) {
        if (_totalChanges < 3) {
            return 1 days;
        } else {
            return 1 weeks;
        }
    }
}
