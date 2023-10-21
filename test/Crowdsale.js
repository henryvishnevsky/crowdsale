const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')	
}

const ether = tokens

describe('Crowdsale', () => {

	let crowdsale, token, accounts, deployer, user1

	beforeEach(async () => {
		//Load contracts
		const Crowdsale = await ethers.getContractFactory('Crowdsale')
		const Token = await ethers.getContractFactory('Token')

    //Deploy token
		token = await Token.deploy('Henry token', 'HENRY', '1000000')

    // Configure accounts
		accounts = await ethers.getSigners()
		deployer = accounts[0]
		user1 = accounts[1]

		//Deploy crowdsale	
		crowdsale = await Crowdsale.deploy(token.address, ether(1), '1000000')	

		// Send tokens to crowdsale
		let transaction = await token.connect(deployer).transfer(crowdsale.address, tokens(1000000))
		await transaction.wait()

	})

	describe('Deployment', () => {

		it('sends tokens to Crowdsale contract', async () => {			
			expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(1000000)) 
		})

		it('returns the price', async () => {			
			expect(await crowdsale.price()).to.equal(ether(1)) 
		})

		it('returns token address', async () => {			
			expect(await crowdsale.token()).to.equal(token.address) 
		})

	})

	describe('Buying Tokens', () => {
		let transaction, result
		let amount = tokens(10)

		describe('Success', () => {
			beforeEach(async () => {
				transaction = await crowdsale.connect(user1).buyTokens(amount, { value: ether(10) }) 
				result = await transaction.wait()
		})

			it('transfer tokens', async () => {
				expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(999990))
				expect(await token.balanceOf(user1.address)).to.equal(amount)
			})

			it('updates contracts ether balance', async () => {
				expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(amount)
			})

			it('updates tokensSold', async () => {
				expect(await crowdsale.tokensSold()).to.equal(amount)
			})

			it('emits a buy event', async () => {
				await expect(transaction).to.emit(crowdsale, 'Buy')
				.withArgs(amount, user1.address)
			})

		})

		describe('Failure', () => {

			it('rejects insufficient ETH', async () => {
				await expect(crowdsale.connect(user1).buyTokens(tokens(10), { value: 0})).to.be.reverted
			})

			// it('rejects if not enough tokens to sell ', async () => {
			// 	await expect(crowdsale.connect(user1).buyTokens(tokens(1000001)).to.be.reverted
			// })

		})

	})

	describe('Sending ETH', () => {
		let transaction, result
		let amount = tokens(10)


		describe('Success', () => {

			beforeEach(async () => {
				transaction = await user1.sendTransaction({ to: crowdsale.address, value: amount})
				result = await transaction.wait()
		  })

			it('updates contracts ether balance', async () => {
				expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(amount)
			})

			it('updates user token balance', async () => {
				expect(await token.balanceOf(user1.address)).to.equal(amount)
			})

		})

	})

	describe('Updating Price', () => {
		let transaction, result
		let price = ether(2)

		describe('Success', () => {

			beforeEach(async () => {
				transaction = await crowdsale.connect(deployer).setPrice(ether(2))
				result = await transaction.wait()
			})

			it('updates the price', async () => {
				expect(await crowdsale.price()).to.equal(ether(2))
			})

		})

		describe('Failure', () => {
			
			it('prevents non-owner from updading the price', async () => {
				await expect(crowdsale.connect(user1).setPrice(price)).to.be.reverted
			})
		})

	})

	describe('Finalizing sale', () => {
		let transaction, result
		let amount = tokens(10)
		let value = ether(10)

		describe('Success', () => {
			beforeEach(async () => {
				transaction = await crowdsale.connect(user1).buyTokens(amount, { value: ether(10) }) 
				result = await transaction.wait()

				transaction = await crowdsale.connect(deployer).finalize()
				result = await transaction.wait()
			})

			it('transfers remaining tokens to owner', async () => {
				expect(await token.balanceOf(crowdsale.address)).to.equal(0)
				expect(await token.balanceOf(deployer.address)).to.equal(tokens(999990))
			})

			it('transfers ETH balance to owner', async () => {
				expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(0)
			})

			it('emits Finalize event', async () => {
				await expect(transaction).to.emit(crowdsale, "Finalize").withArgs(amount, value)
			})

		})

		describe('Failure', () => {

			it('prevents non-owner from finalizing', async () => {
				await expect(crowdsale.connect(user1).finalize()).to.be.reverted
			})
			
		})

	})

})