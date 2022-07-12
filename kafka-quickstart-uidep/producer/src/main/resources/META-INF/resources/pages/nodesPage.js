import {doPost, errorPopUp} from "../web/web.js";
import {createTableItem} from "../util/contentManagement.js";

export default class NodesPage {
    constructor(containerId) {
        this.containerId = containerId;
        Object.getOwnPropertyNames(NodesPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    // TODO: stub. must be implemented by all pages
    open() {
        const req = {
            action: "getInfo", key: "0", value: "0"
        };
        doPost(req, (data) => {
            let that = this;
            setTimeout(function () {
                that.updateInfo(data);
                that.toggleSpinner();
            }, 2000);
        }, data => {
            errorPopUp("Error getting Kafka info: ", data);
        });
        this.toggleSpinner();
    }

    updateInfo(data) {
        $('#cluster-id').html(data.clusterInfo.id);
        $('#cluster-controller').html(data.broker);
        $('#cluster-acl').html(data.clusterInfo.aclOperations);

        const nodes = data.clusterInfo.nodes;
        let clusterNodesTable = $('#cluster-table tbody');
        clusterNodesTable.empty();
        for (let i = 0; i < nodes.length; i++) {
            const d = nodes[i];
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(d.id));
            tableRow.append(createTableItem(d.host));
            tableRow.append(createTableItem(d.port));
            clusterNodesTable.append(tableRow);
        }
    }

    toggleSpinner() {
        const spinnerId = "#page-load-spinner";
        const pageId = "#" + this.containerId;
        let first;
        let second;

        if ($(spinnerId).hasClass("shown")) {
            first = pageId;
            second = spinnerId;
        } else {
            second = pageId;
            first = spinnerId;
        }

        $(first)
            .removeClass("hidden")
            .addClass("shown");
        $(second)
            .addClass("hidden")
            .removeClass("shown");
    }

}