/**
 * Optimized Xorshift32 PRNG
 */
class RNG {
    constructor(seed) {
        this.seed = seed ?? RNG.generateSeed();
        this.state = this.seed || 0xDEADBEEF; // Ensure non-zero state
    }

    /**
     * Generate a random number
     * @returns {number} - A random number between 0 and 1
     */
    random() {
        this.state ^= this.state << 13;
        this.state ^= this.state >>> 17;
        this.state ^= this.state << 5;
        return (this.state >>> 0) / 4294967296;
    }

    /**
     * Generate a seed for the RNG
     * @returns {number} - A 32-bit integer seed
     */
    static generateSeed() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const buf = new Uint32Array(1);
            crypto.getRandomValues(buf);
            return buf[0];
        }
        return (performance?.now() * 1000 & 0xFFFFFFFF) || 
               (Date.now() * 9999 & 0xFFFFFFFF);
    }
}

// Create and bind the shared instance
const sharedRNG = new RNG();
const random = sharedRNG.random.bind(sharedRNG);

// Export the class and bound function
export { RNG, random };

// Default export is the shared instance
export default sharedRNG;