/**
 * Trie node for the VLMM
 */
export class VLMMNode {
    constructor() {
        this.children = new Map(); // token -> VLMMNode
        this.nextCounts = new Map(); // token -> count
    }

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

    getNode(context, index = 0) {
        if (index === context.length) return this;

        const token = context[index];
        if (!this.children.has(token)) return null;

        return this.children.get(token).getNode(context, index + 1);
    }

    toJSON() {
        return {
            nextCounts: Object.fromEntries(this.nextCounts),
            children: Object.fromEntries(
                Array.from(this.children.entries()).map(([token, node]) => [token, node.toJSON()])
            )
        };
    }

    static fromJSON(json) {
        const node = new VLMMNode();
        node.nextCounts = new Map(Object.entries(json.nextCounts || {}));
        node.children = new Map(
            Object.entries(json.children || {}).map(([token, childJson]) => [token, VLMMNode.fromJSON(childJson)])
        );
        return node;
    }

    countNodes() {
        let total = 1;
        for (const child of this.children.values()) {
            total += child.countNodes();
        }
        return total;
    }

    countTransitions() {
        let total = this.nextCounts.size;
        for (const child of this.children.values()) {
            total += child.countTransitions();
        }
        return total;
    }
}
