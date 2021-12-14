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
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

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
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
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
        let self = this;  // store reference of original class
        return new Promise(async (resolve, reject) => {
            
            block.height = self.chain.length; //get current chain height
            block.time = new Date().getTime().toString().slice(0,-3); //get current time
            if(self.chain.length > 0){
                block.previousBlockHash = self.chain[self.chain.length-1].hash; //get and assign previous block hash
            }
            block.hash = SHA256(JSON.stringify(block)).toString(); //calculate hash
            //Validation
            let errors = await self.validateChain(); //call the validate chain method and get any errors
            console.log(errors)
            if (errors.length === 0 ){ //if no errors in blockchain
                self.chain.push(block); //push new block
                self.height++; //// update current heigh of block by 1 cos a new block is added 
                resolve(block) //resolve the new block
            }else{
                reject(errors);
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
            const message = `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`; //construct the message as explained, with the address + time + starRegistry
            resolve(message);   
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
        let self = this;
        return new Promise(async (resolve, reject) => {
            let time = parseInt(message.split(':')[1]);
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            if((time + (5*60*1000)) >= currentTime){
                // verify the signature
                let isValid = bitcoinMessage.verify(message, address, signature);
                if(isValid){
                    let block = new BlockClass.Block({data: star, owner: address});
                    let addedBlock = await self._addBlock(block);
                    resolve(addedBlock);
                } else {
                    reject('Your signature is not valid');
                }
            } else {
                reject('You should submit the star before 5 minutes');
            }
        });
    }
    // submitStar(address, message, signature, star) {
    //     let self = this;
    //     return new Promise(async (resolve, reject) => {
    //         let msg_time = parseInt(message.split(':')[1]); //Get the time component value from the message sent as a parameter (line 96)
    //         let currentTime = parseInt(new Date().getTime().toString().slice(0, -3)); //Get the current time
    //         if (currentTime - msg_time < (5*60))
    //         { //Check if the time elapsed since when the message was sent to the current time is less than 5 minutes
    //             if(bitcoinMessage.verify(message, address, signature)) 
    //             {  //If yes verify the message
    //                 let block = new BlockClass.Block({"owner":address, "star":star});  //creation of the new block with the owner and the star 
    //                 self._addBlock(block);                                            //Add the block
    //                 resolve(block);                                                   //Resolve with the new block
    //             }
    //             else
    //             {
    //                 reject(Error('Message is not verified'))                          //Error message
    //             }
    //         }
    //         else
    //         {
    //             reject(Error('too much time has passed, stay below 5 minutes'))       //Error message
    //         }
    //     });
    // }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           var block = self.chain.filter(block => block.hash === hash); // get block of the same value and type of the block that belong to the hash parameter

           // check if the block is valid
           if(typeof block == 'undefined'){
                reject(Error('Block was not found'));
           }else{
               resolve(block);
           }
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
            if(block){
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
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach(async(b)=> {        //loop on the blocks present in the chain
                let data = await b.getBData();        //get decoded block data for each block
                if(data){
                    if(data.owner === address){       //check if owner of the star address is the same address passed in param
                      stars.push(data);               //if yes, add star's data to stars array
                    }
                }
            })
            
            if (stars.some((x) => x % 2 === 0)){        // if stars.Any()
                resolve(stars);                            //return array of stars             
            }else{
                reject(Error(`Collection of stars was not found for ${address}`));
            }   

        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errors = [];
        return new Promise(async (resolve, reject) => {
            // loop through all blocks and ensure that the  hash value of previous block stored on current 
            //block is the same as the actual hash of previous block 
            let promises = [];
            self.chain.forEach((block, i) => {
                if (block.height > 0) {
                    const prev_block = self.chain[index - 1];
                    if (block.previousBlockHash !== prev_block.hash) {
                        const error_message = `Block ${i} previousBlockHash set to ${block.previousBlockHash}, but actual previous block hash was ${prev_block.hash}`;
                        errors.push(error_message);
                    }
                }

                // Store promise to validate each block
                promises.push(block.validate());
            });

            // Collect results of each block's validate call
            Promise.all(promises)
            .then(validated_blocks => {
                validated_blocks.forEach((valid, i) => {
                    if (!valid) {
                        const invalid_block = self.chain[i];
                        const err_Msg = `Block ${i} hash (${invalid_block.hash}) is invalid`;
                        errors.push(err_Msg);
                    }
                });

                resolve(errors);
            });
        });
    }

}

module.exports.Blockchain = Blockchain;   