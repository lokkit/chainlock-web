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
        accounts: ['0x444444444']
      },
      rentables: [{
        // fields of the contract
        owner: '0x0001000',
        description: 'le descpiption',
        location: 'le location',
        costPerSecond: 50,
        deposit: 500,
        reservations: [{
          start: '10:00',
          end: '14:00',
          renter: '0x444444444'
        }, {
          start: '10:00',
          end: '14:00',
          renter: '0x444444444'
        },
        {
          start: '10:00',
          end: '14:00',
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
    getAccounts (state) {
      return state.node.accounts
    }
  },
  mutations: {
    initialize (state, data) {
      const accounts = web3.eth.accounts
      state.node.accounts = accounts
    },
    setAccounts (state, data) {
      state.node.accounts = data
    },
    addRentable (state, data) {
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
    initialize (context, data) {
      web3 = new Web3(new Web3.providers.HttpProvider('http://' + context.state.node.host + ':' + context.state.node.port))
      rentableService = new EthereumRentableService(web3)
      context.commit('initialize')
    },
    setAccounts (context, data) {
      context.commit('setAccounts', data)
    },
    // Loads a contract given by its address from the blockchain
    addRentable (context, data) {
      const r = rentableService.rentableFromAddress(data.address)
      context.commit('addRentable', {
        // additional fields
        address: data.address,
        locked: false,
        // fields of contract
        owner: r.owner(),
        description: r.description(),
        location: r.location(),
        costPerSecond: r.costPerSecond(),
        deposit: r.deposit(),
        reservations: r.allReservations()
      })
    },
    reserve (context, data) {
      // TODO: check if possible to reserve
      context.commit('reserve', data)
    },
    lock (context, data) {
      context.commit('lock', data)
    },
    unlock (context, data) {
      context.commit('unlock', data)
    },
    unclaim (context, data) {
      context.commit('unclaim', data)
    }
  }
})
