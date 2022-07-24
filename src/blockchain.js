/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const bitcoinMessage = require('bitcoinjs-message');
const BlockClass = require('./block.js');
const UtilsClass = require('./utils.js');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if (this.height === -1) {
            let block = new BlockClass.Block({ data: 'Genesis Block' });
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        return new Promise(async (resolve, reject) => {
            try {
                // Assign the timestamp
                block.time = UtilsClass.Utils.currentTime();

                // Assign the block height
                block.height = this.height + 1;

                // Check the chain has previous block
                if (this.chain[this.height]) {
                    // Assign the previousBlockHash
                    block.previousBlockHash = this.chain[this.height].hash;
                }

                // Calculate the hash of the Block
                block.hash = SHA256(JSON.stringify(block)).toString();

                // Push the block into the chain array
                this.chain.push(block);

                // Make sure added block dosen't break chain
                const errors = await this.validateChain();

                // Check if there any errors in the chain
                if (errors.length) {
                    // Reject with validate chain errors
                    reject(errors);
                } else {
                    // Update the chain height
                    this.height = block.height;

                    // Resolve with the block added
                    resolve(block);
                }
            } catch (error) {
                // Reject if an error happen during the execution
                reject(error);
            }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            // Generate raw message
            const rawMessage = `${address}:${UtilsClass.Utils.currentTime()}:starRegistry`;

            // Resolve with generated message
            resolve(rawMessage);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        return new Promise(async (resolve, reject) => {
            // Parse the message string to object
            const messageParams = message.split(':');

            // Resolve the time from message params
            const time = parseInt(messageParams[1]);

            // Get the current time
            const currentTime = UtilsClass.Utils.currentTime();

            // Add 5 minutes to message time to check time elapsed
            const timeElapsed = time + (5 * 60);

            // Check time elapsed
            if (timeElapsed >= currentTime) {

                // Verify the message signature
                if (bitcoinMessage.verify(message, address, signature)) {
                    // Construct the block instance
                    const block = new BlockClass.Block({ owner: address, star });

                    // Add block to the chain
                    const addedBlock = await this._addBlock(block);

                    // Resolve the added block
                    resolve(addedBlock);
                } else {
                    reject('Signature is invalid.');
                }

            } else {
                reject('Time is elapsed, You must submit before 5 minutes');
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        return new Promise((resolve) => {
            // Search on the chain array for the block that has the hash.
            let block = this.chain.find(item => item.hash === hash);

            // Resolve null if there are no block hash passed as a parameter
            if (!block) {
                block = null;
            }

            // Resolve with the Block with the hash passed as a parameter.
            resolve(block);
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if (block) {
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        return new Promise((resolve) => {
            // Get the address owned blocks
            const starts = this.chain.reduce((carry, block) => {

                // Get the block data;
                const data = block.getBData();

                // Check block data address is matched with given address
                if (data && data.owner === address) {
                    carry.push(data);
                }

                return carry
            }, []);

            resolve(starts);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        return new Promise(async (resolve, reject) => {
            try {
                const errrors = (await Promise.all(this.chain.map(async (block, index) => {
                    // Validate the block
                    let isValid;
                    try {
                        isValid = await block.validate()
                    } catch (error) {
                        return error.message;
                    }

                    // Ensure the block is valid
                    if (!isValid) {
                        return `Block Heigh: ${block.height} - Hash donsn't match.`;
                    }

                    // Ensure the block is not a genesis block
                    if (block.height > 0) {

                        // Get the previous block hash from current block
                        const previousBlockHash = block.previousBlockHash;

                        // Get the previous block and get the hash of it.
                        const blockHash = this.chain[index - 1].hash;

                        // Check the previous block's hash and current block's previousBlockHash are matched
                        if (blockHash !== previousBlockHash) {
                            return `Block Heigh: ${block.height} - Previous hash donsn't match.`;
                        }
                    }
                }))).filter(Boolean); // Ensure 

                resolve(errrors);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports.Blockchain = Blockchain;
