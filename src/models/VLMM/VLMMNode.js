/**
 * Trie node for the VLMM with improved functionality
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
     * Check if this node has any next tokens
     * @returns {boolean}
     */
    hasTransitions() {
        return this.nextCounts.size > 0;
    }

    /**
     * Get the most frequent next token
     * @returns {string|null}
     */
    getMostFrequentNext() {
        if (this.nextCounts.size === 0) return null;
        
        let maxCount = 0;
        let mostFrequent = null;
        
        for (const [token, count] of this.nextCounts) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = token;
            }
        }
        
        return mostFrequent;
    }

    /**
     * Get total count of all transitions from this node
     * @returns {number}
     */
    getTotalTransitions() {
        return Array.from(this.nextCounts.values()).reduce((sum, count) => sum + count, 0);
    }

    /**
     * Get context statistics recursively
     * @param {Map} contextLengths - Map to store context length counts
     * @param {number} depth - Current depth in trie
     */
    getContextStats(contextLengths, depth) {
        if (this.nextCounts.size > 0) {
            contextLengths.set(depth, (contextLengths.get(depth) || 0) + 1);
        }
        
        for (const child of this.children.values()) {
            child.getContextStats(contextLengths, depth + 1);
        }
    }

    /**
     * Get all contexts at a specific depth
     * @param {number} targetDepth - Target depth
     * @param {string[]} currentPath - Current path tokens
     * @returns {Array} - Array of {context, node} objects
     */
    getContextsAtDepth(targetDepth, currentPath = []) {
        const results = [];
        
        if (currentPath.length === targetDepth) {
            if (this.nextCounts.size > 0) {
                results.push({
                    context: [...currentPath],
                    node: this,
                    transitions: this.nextCounts.size,
                    totalCount: this.getTotalTransitions()
                });
            }
            return results;
        }
        
        for (const [token, child] of this.children) {
            results.push(...child.getContextsAtDepth(targetDepth, [...currentPath, token]));
        }
        
        return results;
    }

    /**
     * Prune nodes with counts below threshold
     * @param {number} minCount - Minimum count threshold
     * @returns {number} - Number of transitions pruned
     */
    prune(minCount) {
        let pruned = 0;
        
        // Prune next tokens with low counts
        for (const [token, count] of this.nextCounts) {
            if (count < minCount) {
                this.nextCounts.delete(token);
                pruned++;
            }
        }
        
        // Recursively prune children
        for (const [token, child] of this.children) {
            pruned += child.prune(minCount);
            
            // Remove child if it has no transitions and no children
            if (child.nextCounts.size === 0 && child.children.size === 0) {
                this.children.delete(token);
            }
        }
        
        return pruned;
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
        
        // Handle nextCounts - ensure they are numbers
        if (json.nextCounts) {
            for (const [token, count] of Object.entries(json.nextCounts)) {
                node.nextCounts.set(token, Number(count));
            }
        }
        
        // Recursively build children
        if (json.children) {
            for (const [token, childJson] of Object.entries(json.children)) {
                node.children.set(token, VLMMNode.fromJSON(childJson));
            }
        }
        
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

    /**
     * Get memory usage statistics
     * @returns {Object}
     */
    getMemoryStats() {
        const stats = {
            nodes: this.countNodes(),
            transitions: this.countTransitions(),
            maxDepth: 0,
            avgBranchingFactor: 0
        };
        
        this._getDepthStats(stats, 0);
        
        if (stats.nodes > 0) {
            stats.avgBranchingFactor = stats.transitions / stats.nodes;
        }
        
        return stats;
    }

    /**
     * Helper for depth statistics
     * @private
     */
    _getDepthStats(stats, depth) {
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        
        for (const child of this.children.values()) {
            child._getDepthStats(stats, depth + 1);
        }
    }
}