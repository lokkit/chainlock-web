import Vue from 'vue'
import Vuex from 'vuex'
import createPersist from 'vuex-localstorage'
import Web3 from 'web3'

import EthereumRentableService from './services/EthereumRentableService.js'

Vue.use(Vuex)

var web3 = null
var rentableService = null

export const store = new Vuex.Store({
  plugins: [createPersist({
    namespace: 'lokkit-webapp-state',
    initialState: {
      node: {
        host: 'localhost',
        port: '8545',
        connected: false,
        accounts: [{
          address: '0xe0a83a8b5ba5c9acc140f89296187f96a163cf43',
          default: false
        }]
      },
      currentRentable: null,
      activeAccount: null,
      rentables: [{
        // fields of the contract
        owner: '0x0001000',
        description: 'le descpiption',
        location: 'le location',
        costPerSecond: 50,
        deposit: 500,
        reservations: [{
          start: 1496100960,
          end: 1496100960,
          renter: '0x444444444'
        }, {
          start: 1496100960,
          end: 1496100960,
          renter: '0x444444444'
        },
        {
          start: 1496100960,
          end: 1496100960,
          renter: '0x444444444'
        }],
        // additional fields
        address: '0x111111111',
        locked: false
      },
      {
        // fields of the contract
        owner: '0x0002000',
        description: 'le descpiption 2',
        location: 'le location 2',
        costPerSecond: 10,
        deposit: 100,
        reservations: [],
        // additional fields
        address: '0x111111112',
        locked: false
      }]
    },
    expires: 7 * 24 * 60 * 30 * 1e3
  })],
  getters: {
    getRentables (state) {
      return state.rentables
    },
    currentRentable (state) {
      return state.currentRentable
    },
    activeAccount (state) {
      return state.activeAccount
    },
    getAccounts (state) {
      return state.node.accounts
    }
  },
  mutations: {
    initialize (state, data) {
      const accounts = web3.personal.listAccounts.map((item) => {
        return {address: item, default: false}
      })
      state.node.accounts = accounts
    },
    loadRentable (state, data) {
      if (data != null) {
        const existingRentable = state.rentables.find(o => o.address === data.address)
        if (existingRentable) {
          const index = state.rentables.indexOf(existingRentable)
          state.rentables[index] = data
        } else {
          state.rentables.push(data)
        }
      }
      state.currentRentable = data
    },
    updateReservationsOfRentable (state, data) {
      const rentable = state.rentables.find(o => o.address === data.rentableAddress)
      rentable.reservations.push(data.reservation)
    },
    unloadRentable (state) {
      state.currentRentable = null
    },
    setActiveAccount (state, {accountAddress, passphrase}) {
      const account = state.node.accounts.find(o => o.address === accountAddress)

      // deactivate current account if available
      if (state.activeAccount) {
        const currentAccount = state.node.accounts.find(o => o.address === state.activeAccount.address)
        currentAccount.default = false
      }

      // set new active account
      account.default = true
      state.activeAccount = {...account, passphrase}
    },
    setAccounts (state, data) {
      state.node.accounts = data
    },
    addRentable (state, data) {
      const existingRentable = state.rentable.find(o => o.address === data.rentableAddress)
      if (existingRentable) {
        const index = state.rentables.indexOf(existingRentable)
        state.rentables[index] = data
        return
      }
      state.rentables.push(data)
    },
    reserve (state, data) {
      const rentable = state.rentables.find(o => o.address === data.rentableAddress)
      rentable.reservations.push({
        start: data.start,
        end: data.end,
        renter: data.account
      })
    },
    lock (state, data) {
      const rentable = state.rentables.find(o => o.address === data.rentableAddress)
      rentable.locked = true
    },
    unlock (state, data) {
      const rentable = state.rentables.find(o => o.address === data.rentableAddress)
      rentable.locked = false
    },
    unclaim (state, data) {
    }
  },
  actions: {
    initialize ({state, commit, dispatch}, data) {
      const nodeUrl = 'http://' + state.node.host + ':' + state.node.port
      web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl))
      const p = new Promise((resolve, reject) => {
        rentableService = new EthereumRentableService(web3)
        commit('initialize')

        // restore activeAccount
        if (state.activeAccount != null) {
          dispatch('switchAccount', {
            accountAddress: state.activeAccount.address,
            passphrase: state.activeAccount.passphrase
          })
        }
        resolve('Successfully connected to node "' + nodeUrl + '"')
      })
      return p
    },
    // data: {account: '0x000', passphrase: '2324', action}
    switchAccount ({commit}, data) {
      return new Promise((resolve, reject) => {
        console.log('unlockAccount', data)
        web3.personal.unlockAccount(data.accountAddress, data.passphrase)
        console.log('setActiveAccount', data)
        commit('setActiveAccount', data)
        console.log('lockAccount again', data)
        web3.personal.lockAccount(data.accountAddress)
        resolve('Successfully switched')
      })
    },
    loadRentableByAddress ({commit}, data) {
      // TODO: error handling
      const rentable = rentableService.createRentableFromAddress(data.rentableAddress)
      rentable.startListeningForNewRents((result) => {
        commit('updateReservationsOfRentable', {rentableAddress: data.rentableAddress, reservation: result})
      })

      commit('loadRentable', {
        // additional fields
        contract: rentable,
        address: data.rentableAddress,
        locked: false,
        // fields of contract
        owner: rentable.owner,
        description: rentable.description,
        location: rentable.location,
        costPerSecond: rentable.costPerSecond,
        deposit: rentable.deposit,
        reservations: rentable.reservations
      })
    },
    unloadRentableByAddress ({commit, state}) {
      state.currentRentable.contract.stopListeningForNewRents()
      commit('unloadRentable')
    },
    setAccounts ({commit}, data) {
      commit('setAccounts', data)
    },
    // Loads a contract given by its address from the blockchain
    addRentable ({commit}, data) {
      const r = rentableService.createRentableFromAddress(data.address)
      commit('addRentable', {
        // additional fields
        address: data.address,
        locked: false,
        // fields of contract
        owner: r.owner,
        description: r.description,
        location: r.location,
        costPerSecond: r.costPerSecond,
        deposit: r.deposit,
        reservations: r.allReservations
      })
    },
    reserve ({state}, data) {
      const rentable = state.rentables.find(o => o.address === data.rentableAddress)
      if (rentable.contract.reservedBetween(data.start, data.end)) {
        Vue.toasted.error('There is already a reservation conflicting to this one')
        return
      }
      data.action.actionStart()
      data.action.actionUpdate('Sending transaction')
      rentable.contract.rent(state.activeAccount.address, state.activeAccount.passphrase, data.start, data.end, data.action.actionComplete)
    },
    lock ({commit}, data) {
      commit('lock', data)
    },
    unlock ({commit}, data) {
      commit('unlock', data)
    },
    unclaim ({commit}, data) {
      commit('unclaim', data)
    }
  }
})
