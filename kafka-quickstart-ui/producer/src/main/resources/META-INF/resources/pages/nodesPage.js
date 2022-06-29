export default class NodesPage{
    constructor(containerId) {
        this.containerId = containerId;
        Object.getOwnPropertyNames(NodesPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    // TODO: stub. must be implemented by all pages
    open(){

    }

}