export default class EthereumRentableService {

  static abi = [ { 'constant': true, 'inputs': [], 'name': 'myPendingRefund', 'outputs': [ { 'name': '', 'type': 'uint256' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'costPerSecond', 'outputs': [ { 'name': '', 'type': 'uint256' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [ { 'name': 'start', 'type': 'uint256' }, { 'name': 'end', 'type': 'uint256' } ], 'name': 'completeReservation', 'outputs': [], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'currentRenter', 'outputs': [ { 'name': '', 'type': 'address' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'location', 'outputs': [ { 'name': '', 'type': 'string' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'description', 'outputs': [ { 'name': '', 'type': 'string' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [ { 'name': 'start', 'type': 'uint256' }, { 'name': 'end', 'type': 'uint256' } ], 'name': 'rent', 'outputs': [], 'payable': true, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'owner', 'outputs': [ { 'name': '', 'type': 'address' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [], 'name': 'withdrawRefunds', 'outputs': [ { 'name': '', 'type': 'bool' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [ { 'name': 'mins', 'type': 'uint256' } ], 'name': 'rentNowForMinutes', 'outputs': [], 'payable': true, 'type': 'function' }, { 'constant': false, 'inputs': [], 'name': 'finishEarly', 'outputs': [], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'deposit', 'outputs': [ { 'name': '', 'type': 'uint256' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [ { 'name': 'start', 'type': 'uint256' }, { 'name': 'end', 'type': 'uint256' } ], 'name': 'costInWei', 'outputs': [ { 'name': '', 'type': 'uint256' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [], 'name': 'allReservations', 'outputs': [ { 'name': '', 'type': 'uint256[3][]' } ], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [ { 'name': 'time', 'type': 'uint256' } ], 'name': 'reservedAt', 'outputs': [ { 'name': '', 'type': 'bool' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [ { 'name': 'newOwner', 'type': 'address' } ], 'name': 'transferOwnership', 'outputs': [], 'payable': false, 'type': 'function' }, { 'constant': true, 'inputs': [ { 'name': 'start', 'type': 'uint256' }, { 'name': 'end', 'type': 'uint256' } ], 'name': 'reservedBetween', 'outputs': [ { 'name': '', 'type': 'bool' } ], 'payable': false, 'type': 'function' }, { 'constant': false, 'inputs': [ { 'name': 'end', 'type': 'uint256' } ], 'name': 'rentNowUntil', 'outputs': [], 'payable': true, 'type': 'function' }, { 'inputs': [ { 'name': 'pdescription', 'type': 'string' }, { 'name': 'plocation', 'type': 'string' }, { 'name': 'pcostPerSecond', 'type': 'uint256' }, { 'name': 'pdeposit', 'type': 'uint256' } ], 'payable': false, 'type': 'constructor' }, { 'anonymous': false, 'inputs': [ { 'indexed': true, 'name': 'success', 'type': 'bool' }, { 'indexed': true, 'name': 'renter', 'type': 'address' }, { 'indexed': false, 'name': 'start', 'type': 'uint256' }, { 'indexed': false, 'name': 'end', 'type': 'uint256' }, { 'indexed': false, 'name': 'msg', 'type': 'string' } ], 'name': 'OnRent', 'type': 'event' } ]

  static symmetricKeyPassword = 'lokkit'

  constructor (web3) {
    this.web3 = web3

    this.rentableContract = this.web3.eth.contract(EthereumRentableService.abi)

    this.symmetricKeyAddress = this.web3.shh.addSymmetricKeyFromPassword(EthereumRentableService.symmetricKeyPassword)
    this.symmetricKey = this.web3.shh.getSymmetricKey(this.symmetricKeyAddress)

    this.asymmetricKeyAddress = this.web3.shh.newKeyPair()
    this.publicKey = this.web3.shh.getPublicKey(this.asymmetricKeyAddress)
    this.privateKey = this.web3.shh.getPrivateKey(this.asymmetricKeyAddress)
  }

  getAccountsWithBalance () {
    return this.web3.personal.listAccounts.map((item) => {
      return {
        address: item,
        balance: this.web3.fromWei(this.web3.eth.getBalance(item), 'ether').valueOf(),
        default: false
      }
    })
  }

  createRentableFromAddress (rentableAddress) {
    const self = this
    const rentable = self.rentableContract.at(rentableAddress)
    // FIXME: detect address is a real contract
    // Maybe add a method to the contract to check if it is valid
    // For now we miss use owner() wich retunrs '0x' if invalid address
    console.log('hehehehhehehehehe', rentable.owner())
    if (rentable.owner() === '0x') {
      throw new Error('The address "' + rentableAddress + '" does not seem to be a valid rentable')
    }

    function normalizeReservations (reservations) {
      return reservations.map(item => {
        return { start: item[0].toNumber(), end: item[1].toNumber() }
      }).sort((a, b) => { return a.start - b.start })
    }

    var filterForNewRents = null
    const startListeningForNewRents = function (callback) {
      console.log('Debug: startListeningForNewRents called')
      if (filterForNewRents) {
        console.log('Warning: Replace current filterForNewRents with new one for rentable ' + rentableAddress)
        filterForNewRents.stopWatching()
      }
      filterForNewRents = rentable.OnRent({ success: true }, (error, result) => {
        console.log(error, result.args)
        callback(result.args)
      })
    }

    const stopListeningForNewRents = function () {
      if (filterForNewRents != null) {
        filterForNewRents.stopWatching()
      }
    }

    const rent = function (accountAddress, passphrase, start, end, callback) {
      var cost = rentable.costInWei(start, end)
      if (self.unlock(accountAddress, passphrase)) {
        // TODO: estimate gas and gas price

        console.log('Debug: Start filtering')
        const filterRentEvents = rentable.OnRent(function (err, result) {
          filterRentEvents.stopWatching()
          if (err) {
            callback(true, result.args)
            return
          }
          const res = result.args
          res.start = res.start.toNumber()
          res.end = res.end.toNumber()
          callback(!result.args.success, res)
        })
        rentable.rent.sendTransaction(start, end, { from: accountAddress, gas: '0x50000', gasPrice: '0x6000', value: self.web3.toHex(cost) })

        self.lock(accountAddress)
      } else {
        throw new Error('Could not send transaction')
      }
    }

    const reservedBetween = function (start, end) {
      return rentable.reservedBetween(start, end)
    }

    const sendCommand = function (rentableAddress, command) {
      const message = { 'command': command, 'key': self.publicKey, 'rentableAddress': rentableAddress } // IMPORTANT: alphabetical order to ensure consistency when using ecRecover!
      const messageBytes = self.web3.fromAscii(JSON.stringify(message))
      const digest = self.sign(messageBytes)
      const payload = self.web3.fromAscii(JSON.stringify({ 'digest': digest, 'message': message }))
      const topic = self.web3.sha3(rentableAddress).substr(0, 10)

      self.web3.shh.post({
        'type': 'sym',
        'ttl': 20,
        'topic': topic,
        'powTarget': 2.5, // todo: better estimate powTarget
        'powTime': 8, // todo: better estimate powTime
        'key': self.symmetricKeyAddress,
        'sig': self.asymmetricKeyAddress,
        'payload': payload
      })
    }

    return {
      rentableAddress,
      owner: rentable.owner(),
      description: rentable.description(),
      location: rentable.location(),
      costPerSecond: rentable.costPerSecond(),
      deposit: rentable.deposit(),
      reservations: normalizeReservations(rentable.allReservations()),

      rent,
      reservedBetween,
      sendCommand,
      startListeningForNewRents,
      stopListeningForNewRents
    }
  }

  unlock (accountAddress, passphrase) {
    try {
      this.web3.personal.unlockAccount(accountAddress, passphrase)
      return true
    } catch (error) {
      console.log(JSON.stringify(error))
      return false
    }
  }

  lock (accountAddress) {
    this.web3.personal.lockAccount(accountAddress)
  }

  sign (accountAddress, passphrase, bytes) {
    this.unlock(accountAddress, passphrase)
    var digest = this.web3.eth.sign(accountAddress, bytes)
    this.lock(accountAddress)
    return digest
  }

}
