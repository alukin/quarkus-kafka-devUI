export default class AccessControlListPage{
    constructor(containerId) {
        this.containerId = containerId;
        Object.getOwnPropertyNames(AccessControlListPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

}