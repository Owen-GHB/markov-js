/**
 * Trie node for the VLMM
 */
export class VLMMNode {
    constructor() {
        this.children = new Map(); // token -> VLMMNode
        this.nextCounts = new Map(); // token -> count
    }

    /**
     * Add a context and next token to the trie
     * @param {string[]} context - The context tokens
     * @param {string} nextToken - The next token
     * @param {number} [index=0] - The current index in the context
     */
    addContext(context, nextToken, index = 0) {
        if (index === context.length) {
            this.nextCounts.set(nextToken, (this.nextCounts.get(nextToken) || 0) + 1);
            return;
        }

        const token = context[index];
        if (!this.children.has(token)) {
            this.children.set(token, new VLMMNode());
        }

        this.children.get(token).addContext(context, nextToken, index + 1);
    }

    /**
     * Get a node from the trie
     * @param {string[]} context - The context tokens
     * @param {number} [index=0] - The current index in the context
     * @returns {VLMMNode|null} - The node or null if not found
     */
    getNode(context, index = 0) {
        if (index === context.length) return this;

        const token = context[index];
        if (!this.children.has(token)) return null;

        return this.children.get(token).getNode(context, index + 1);
    }

    /**
     * Convert the node to a JSON object
     * @returns {Object}
     */
    toJSON() {
        return {
            nextCounts: Object.fromEntries(this.nextCounts),
            children: Object.fromEntries(
                Array.from(this.children.entries()).map(([token, node]) => [token, node.toJSON()])
            )
        };
    }

    /**
     * Create a node from a JSON object
     * @param {Object} json - The JSON object
     * @returns {VLMMNode}
     */
    static fromJSON(json) {
        const node = new VLMMNode();
        node.nextCounts = new Map(Object.entries(json.nextCounts || {}));
        node.children = new Map(
            Object.entries(json.children || {}).map(([token, childJson]) => [token, VLMMNode.fromJSON(childJson)])
        );
        return node;
    }

    /**
     * Count the number of nodes in the trie
     * @returns {number}
     */
    countNodes() {
        let total = 1;
        for (const child of this.children.values()) {
            total += child.countNodes();
        }
        return total;
    }

    /**
     * Count the number of transitions in the trie
     * @returns {number}
     */
    countTransitions() {
        let total = this.nextCounts.size;
        for (const child of this.children.values()) {
            total += child.countTransitions();
        }
        return total;
    }
}
