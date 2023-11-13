// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Token.sol";

contract Crowdsale {
	address public owner;
	Token public token;
	uint256 public price;
	uint256 public maxTokens;
	uint256 public tokensSold;
    uint256 public allowSaleOn;

	event Buy(uint256 amount, address buyer);
	event Finalize(uint256 tokensSold, uint256 ethRaised);

	constructor(
		Token _token,
		uint256 _price,
		uint256 _maxTokens,
		uint256 _allowSaleOn
		) 
	{ 
		owner = msg.sender;
		token = _token;
		price = _price;
		maxTokens = _maxTokens;
		allowSaleOn = _allowSaleOn;
	}

	mapping(address => bool) public whitelist;

	modifier onlyOwner() {
		require(msg.sender == owner, 'Caller is not the owner');
		_;	
	}

	 modifier onlyWhitelisted() {
        require(whitelist[msg.sender], "Address is not whitelisted");
        _;
    }

	receive() external payable {
		uint256 amount = msg.value / price * 1e18; 
		buyTokens(amount);
	}

	function addToWhitelist(address _account) public onlyOwner {
        require(_account != address(0), "Zero address not allowed");
        whitelist[_account] = true;
    }

    function removeFromWhitelist(address _account) public onlyOwner {
        whitelist[_account] = false;
    }

	function buyTokens(uint256 _amount) public payable onlyWhitelisted {
		require(block.timestamp >= allowSaleOn);
		require(msg.value == (_amount / 1e18) * price); 
		require(_amount / 1e18 >= 5, "Min 5 tokens allowed for purchase");
		require(_amount / 1e18 <= 100, "Max 100 tokens allowed for purchase");
		require(token.balanceOf(address(this)) >= _amount);
		require(token.transfer(msg.sender, _amount));

		tokensSold += _amount;

		emit Buy(_amount, msg.sender);
	}

	function setPrice(uint256 _price) public onlyOwner {
		price = _price;
	}

	function finalize() public onlyOwner{
		//Send remaining tokens to crowdsale creator	
  		require(token.transfer(owner, token.balanceOf(address(this))));

  		//Send Ether to crowdsale creator
  		uint256 value = address(this).balance;
  		(bool sent, ) = owner.call{value: value}("");
  		require(sent);

  		emit Finalize(tokensSold, value);
	}
 
}


