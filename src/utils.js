/**
 *  Utils class
 *  The Utils class is a main component stores utils methods 
 */

class Utils {
    /**
     *  Auxiliary Method to return the current time
     */
    static currentTime() {
        return Math.floor(new Date().getTime() / 1000);
    }
}

// Exposing the Block class as a module
module.exports.Utils = Utils;