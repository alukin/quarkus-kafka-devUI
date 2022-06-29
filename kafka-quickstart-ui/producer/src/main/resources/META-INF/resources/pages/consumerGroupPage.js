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
        this.getKafkaInfo();
    }

    getKafkaInfo() {
        const req = {
            action: "getInfo", key: "0", value: "0"
        };
        doPost(req, (data) => {
            updateInfo(data);
            this.updateConsumerGroups(data.consumerGroups);
        }, data => {
            errorPopUp("Error getting Kafka info: ", data);
        });
    }

    updateInfo(data) {
        $('#cluster-id').html(data.clusterInfo.id);
        $('#cluster-controller').html(data.broker);
        $('#cluster-acl').html(data.clusterInfo.aclOperations);

        const nodes = data.clusterInfo.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const d = nodes[i];
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(d.id));
            tableRow.append(createTableItem(d.host));
            tableRow.append(createTableItem(d.port));
            $('#cluster-table tbody').append(tableRow);
        }
    }

    updateConsumerGroups(data) {
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(d.state));
            tableRow.append(createTableItem(d.name));
            tableRow.append(createTableItem(d.coordinator));
            tableRow.append(createTableItem(d.protocol));
            tableRow.append(createTableItem(d.members));
            tableRow.append(createTableItem(d.lag));
            $('#cgropus-table tbody').append(tableRow);
        }
    }
}