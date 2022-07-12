import {createTableItem} from "../util/contentManagement.js";
import {doPost, errorPopUp} from "../web/web.js";

export default class ConsumerGroupPage {
    constructor(containerId) {
        this.containerId = containerId;
        Object.getOwnPropertyNames(ConsumerGroupPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    open() {
        const req = {
            action: "getInfo", key: "0", value: "0"
        };
        doPost(req, (data) => {
            this.updateConsumerGroups(data.consumerGroups);
        }, data => {
            errorPopUp("Error getting Kafka info: ", data);
        });
    }

    updateConsumerGroups(data) {
        let consumerGroupsTable = $('#consumer-groups-table tbody');
        consumerGroupsTable.empty();
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(d.state));
            tableRow.append(createTableItem(d.name));
            tableRow.append(createTableItem(d.coordinator));
            tableRow.append(createTableItem(d.protocol));
            tableRow.append(createTableItem(d.members));
            tableRow.append(createTableItem(d.lag));
            consumerGroupsTable.append(tableRow);
        }
    }
}