pragma solidity ^0.5.0;

contract Aircraft {

    uint256 private wheels;
    address private driver;

    constructor(uint256 _wheels) public {
        wheels = _wheels;
    }

    function setDriver(address _driver) public {
        require(isDriver(driver), "Already the driver!");
        driver = _driver;
    }

    function isDriver(address _user) private view returns(bool) {
        return driver == _user;
    }

    function getWheels() private view returns(uint256) {
        return wheels;
    }
}
